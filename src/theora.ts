import { OggBitstream, OggPacket } from "./ogg";

const MAGIC_NUMBER_1 = 0x7468
const MAGIC_NUMBER_2 = 0x656F
const MAGIC_NUMBER_3 = 0x7261

const VMAJ = 3
const VMIN = 2

enum HeaderType {
	Identification = 0x80,
	Comment = 0x81,
	Setup = 0x82
}

enum ColorSpace {
	Undefined = 0,
	Rec470M = 1,
	Rec470BG = 2,
	Reserved = 3
}

enum PixelFormat {
	Format420 = 0,
	Reserved = 1,
	Format422 = 2,
	Format444 = 3
}

export interface IdentificationHeader {
	version: string
	fmbw: number
	fmbh: number
	picw: number
	pich: number
	picx: number
	picy: number
	frn: number
	frd: number
	parn: number
	pard: number
	cs: ColorSpace
	nombr: number
	qual: number
	kfgshift: number
	pf: PixelFormat
	nsbs: number
	nbs: number
	nmbs: number
}

export function decodeCommonHeader(packet: OggPacket): HeaderType | undefined {
	const headerType = packet.getUint8(0)
	const magicNumber1 = packet.getUint16(1)
	const magicNumber2 = packet.getUint16(3)
	const magicNumber3 = packet.getUint16(5)

	const isTheoraHeader = magicNumber1 === MAGIC_NUMBER_1 && magicNumber2 === MAGIC_NUMBER_2 && magicNumber3 === MAGIC_NUMBER_3
	const isHeaderPacket = (headerType & 0x80) === 0x80

	if (isTheoraHeader && isHeaderPacket) {
		return headerType
	}
}

export function isTheoraBitstream(stream: OggBitstream): boolean {
	const packet = stream.pages[0]?.packets[0]
	if (!packet) return false
	return !!decodeCommonHeader(packet)
}

export function decodeIdentificationHeader(stream: OggBitstream): IdentificationHeader | undefined {
	const packet = stream.pages[0]?.packets[0]
	if (!packet) return

	const headerType = decodeCommonHeader(packet)
	if (headerType !== HeaderType.Identification) return

	// 6.2 2-3
	const vmaj = packet.getUint8(7)
	const vmin = packet.getUint8(8)
	const vrev = packet.getUint8(9)
	if (vmaj !== VMAJ) return
	if (vmin !== VMIN) return
	const version = `${vmaj}.${vmin}.${vrev}`

	// 6.2 5-6
	const fmbw = packet.getUint16(10)
	const fmbh = packet.getUint16(12)
	if (fmbw <= 0 || fmbh <= 0) return

	// 6.2 7-8
	const picw = packet.getUint32(13) & 0x00FFFFFF
	const pich = packet.getUint32(16) & 0x00FFFFFF
	if (picw > fmbw * 16 || pich > fmbh * 16) return

	// 6.2 9-10
	const picx = packet.getUint8(20)
	const picy = packet.getUint8(21)
	if (picx > fmbw * 16 - picw || picy > fmbh * 16 - pich) return

	// 6.2 11-12
	const frn = packet.getUint32(22)
	const frd = packet.getUint32(26)
	if (frn === 0 || frd === 0) return

	// 6.2 13-14
	const parn = packet.getUint32(29) & 0x00FFFFFF
	const pard = packet.getUint32(32) & 0x00FFFFFF

	// 6.2 15
	const cs = packet.getUint8(36)
	
	// 6.2 16
	const nombr = packet.getUint32(36) & 0x00FFFFFF

	// 6.2 17-20
	const qual = (packet.getUint8(40) & 0b111111) >> 2
	const kfgshift = (packet.getUint16(40) & 0b1111100000) >> 5
	const pf = (packet.getUint8(41) & 0b11000) >> 3
	const reserved = packet.getUint8(41) & 0b111
	if (pf === PixelFormat.Reserved || reserved !== 0) return

	// 6.2 21-23
	let nsbs: number
	let nbs: number
	switch (pf) {
		case PixelFormat.Format420:
			nsbs = Math.floor((fmbw + 1) / 2) * Math.floor((fmbh + 1) / 2) + 2 * Math.floor((fmbw + 3) / 4) * Math.floor((fmbh + 3) / 4)
			nbs = 6 * fmbw * fmbh
			break
		case PixelFormat.Format422:
			nsbs = Math.floor((fmbw + 1) / 2) * Math.floor((fmbh + 1) / 2) + 2 * Math.floor((fmbw + 3) / 4) * Math.floor((fmbh + 1) / 2)
			nbs = 8 * fmbw * fmbh
			break
		case PixelFormat.Format444:
			nsbs = 3 * Math.floor((fmbw + 1) / 2) * Math.floor((fmbh + 1) / 2)
			nbs = 12 * fmbw * fmbh
			break
		default:
			return
	}
	const nmbs = fmbw * fmbh

	return {
		version,
		fmbw,
		fmbh,
		picw,
		pich,
		picx,
		picy,
		frn,
		frd,
		parn,
		pard,
		cs,
		nombr,
		qual,
		kfgshift,
		pf,
		nsbs,
		nbs,
		nmbs
	}
}

export function decodeCommentsHeader(stream: OggBitstream) {
	const packet = stream.pages[1]?.packets[0]
	if (!packet) return

	const headerType = decodeCommonHeader(packet)
	if (headerType !== HeaderType.Comment) return

	// TODO

	return {}
}
