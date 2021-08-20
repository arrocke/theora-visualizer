const MAGIC_NUMBER = 0x4f676753
const VERSION = 0
const CONTINUED_FLAG = 0x01
const BOS_FLAG = 0x02
const EOS_FLAG = 0x04
const MAX_LACING_SIZE = 255
const HEADER_SIZE = 27

export interface OggPage {
	flags: {
		continued: boolean
		bos: boolean
		eos: boolean
	}
	granulePosition: DataView
	serialNumber: number
	pageNumber: number
	checksum: number
	packets: DataView[]
	size: number
}

export interface OggBitstream {
	serialNumber: number
	pages: OggPage[]
}

export interface OggBitstreamMap {
	[serialNumber: number]: OggBitstream | undefined
}

function validatePage(view: DataView, checksum: number): boolean {
	return true
}

export function decodePage(buffer: ArrayBuffer, offset: number): OggPage {
	const view = new DataView(buffer, offset)

	const magicNumber = view.getUint32(0)
	if (magicNumber !== MAGIC_NUMBER)
		throw new Error('Page Decode Error')

	const version = view.getUint8(4)
	if (version !== VERSION)
		throw new Error('Page Decode Error')

	const headerType = view.getUint8(5)
	const flags = {
		continued: (headerType & CONTINUED_FLAG) === CONTINUED_FLAG,
		bos: (headerType & BOS_FLAG) === BOS_FLAG,
		eos: (headerType & EOS_FLAG) === EOS_FLAG
	}

	const granulePosition = new DataView(buffer, offset + 6, 8)
	const serialNumber = view.getUint32(14)
	const pageNumber = view.getUint32(18)
	const checksum = view.getUint32(22)

	const segmentCount = view.getUint8(26)
	const packetSizes = []
	let packetSize = 0
	for (let i = 0; i < segmentCount; i++) {
		const lacingSize = view.getUint8(27 + i)
		packetSize += lacingSize
		if (lacingSize < MAX_LACING_SIZE) {
			packetSizes.push(packetSize)
			packetSize = 0
		}
	}
	if (packetSize > 0) {
		packetSizes.push(packetSize)
	}
	const payloadSize = packetSizes.reduce((total, size) => total + size)
	const pageSize = HEADER_SIZE + segmentCount + payloadSize

	if (!validatePage(new DataView(buffer, offset, pageSize), checksum))
		throw new Error('Page Decode Error')

	const packets = []
	let packetOffset = offset + HEADER_SIZE + segmentCount
	for (const packetSize of packetSizes) {
		packets.push(new DataView(buffer, packetOffset, packetSize))
		packetOffset += packetSize
	}

	return {
		flags,
		granulePosition,
		serialNumber,
		pageNumber,
		checksum,
		packets,
		size: pageSize
	}
}

export function decodePages(buffer: ArrayBuffer): OggPage[] {
	const pages: OggPage[] = []

	for (let offset = 0; offset < buffer.byteLength;) {
		const page = decodePage(buffer, offset)
		pages.push(page)
		offset += page.size
	}

	return pages
}

export function decodeBitstreams(buffer: ArrayBuffer): OggBitstreamMap {
	const pages = decodePages(buffer)
	const bitstreams: { [serialNumber: string]: OggBitstream | undefined } = {}
	for (const page of pages) {
		let bitstream = bitstreams[page.serialNumber]
		if (!bitstream) {
			bitstream = {
				serialNumber: page.serialNumber,
				pages: []
			}
			bitstreams[page.serialNumber] = bitstream
		}
		bitstream.pages.push(page)
	}
	return bitstreams
}