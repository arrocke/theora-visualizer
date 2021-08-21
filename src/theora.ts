import { OggBitstream, OggPacket } from "./ogg";

const MAGIC_NUMBER_1 = 0x7468
const MAGIC_NUMBER_2 = 0x656F
const MAGIC_NUMBER_3 = 0x7261

const VMAJ = 3
const VMIN = 2

function ilog(n: number): number {
	if (n <= 0) return 0
	else return Math.floor(Math.log2(n)) + 1
}

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

export interface SetupHeader {
	lflims: number[]
	acscale: number[],
	dcscale: number[],
	nbms: number,
	bms: number[][],
	nqrs: number[][],
	qrsizes: number[][][],
	qrbmis: number[][][],
	hts: [string, number][][]
}

export function decodeCommonHeader(packet: OggPacket): HeaderType | undefined {
	const headerType = packet.data.getUint8(0)
	const magicNumber1 = packet.data.getUint16(1)
	const magicNumber2 = packet.data.getUint16(3)
	const magicNumber3 = packet.data.getUint16(5)

	const isTheoraHeader = magicNumber1 === MAGIC_NUMBER_1 && magicNumber2 === MAGIC_NUMBER_2 && magicNumber3 === MAGIC_NUMBER_3
	const isHeaderPacket = (headerType & 0x80) === 0x80

	if (isTheoraHeader && isHeaderPacket) {
		return headerType
	}
}

export function isTheoraBitstream(stream: OggBitstream): boolean {
	return !!decodeCommonHeader(stream.packets[0])
}

export function decodeIdentificationHeader(stream: OggBitstream): IdentificationHeader | undefined {
	const packet = stream.packets[0]
	const headerType = decodeCommonHeader(packet)
	if (headerType !== HeaderType.Identification) return

	// 6.2 2-3
	const vmaj = packet.data.getUint8(7)
	const vmin = packet.data.getUint8(8)
	const vrev = packet.data.getUint8(9)
	if (vmaj !== VMAJ) return
	if (vmin !== VMIN) return
	const version = `${vmaj}.${vmin}.${vrev}`

	// 6.2 5-6
	const fmbw = packet.data.getUint16(10)
	const fmbh = packet.data.getUint16(12)
	if (fmbw <= 0 || fmbh <= 0) return

	// 6.2 7-8
	const picw = packet.data.getUint32(13) & 0x00FFFFFF
	const pich = packet.data.getUint32(16) & 0x00FFFFFF
	if (picw > fmbw * 16 || pich > fmbh * 16) return

	// 6.2 9-10
	const picx = packet.data.getUint8(20)
	const picy = packet.data.getUint8(21)
	if (picx > fmbw * 16 - picw || picy > fmbh * 16 - pich) return

	// 6.2 11-12
	const frn = packet.data.getUint32(22)
	const frd = packet.data.getUint32(26)
	if (frn === 0 || frd === 0) return

	// 6.2 13-14
	const parn = packet.data.getUint32(29) & 0x00FFFFFF
	const pard = packet.data.getUint32(32) & 0x00FFFFFF

	// 6.2 15
	const cs = packet.data.getUint8(36)
	
	// 6.2 16
	const nombr = packet.data.getUint32(36) & 0x00FFFFFF

	// 6.2 17-20
	const qual = (packet.data.getUint8(40) & 0b111111) >> 2
	const kfgshift = (packet.data.getUint16(40) & 0b1111100000) >> 5
	const pf = (packet.data.getUint8(41) & 0b11000) >> 3
	const reserved = packet.data.getUint8(41) & 0b111
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
	const packet = stream.packets[1]
	const headerType = decodeCommonHeader(packet)
	if (headerType !== HeaderType.Comment) return

	// TODO

	return {}
}

export function decodeSetupHeader(stream: OggBitstream): SetupHeader | undefined {
	const packet = stream.packets[2]
	const headerType = decodeCommonHeader(packet)
	if (headerType !== HeaderType.Setup) return

	let offset = 7 * 8

	// 6.4.5 2
	// 6.4.1
	let nbits = packet.data.getBits(offset, 3)
	offset += 3

	const lflims = []
	for (let qi = 0; qi < 64; qi++) {
		lflims.push(packet.data.getBits(offset, nbits))
		offset += nbits
	}

	// 6.4.5 3
	// 6.4.2 1-2
	nbits = 1 + packet.data.getBits(offset, 4)
	offset += 4

	const acscale = []
	for (let qi = 0; qi < 64; qi++) {
		acscale.push(packet.data.getBits(offset, nbits))
		offset += nbits
	}

	nbits = 1 + packet.data.getBits(offset, 4)
	offset += 4

	// 6.4.2 1-2
	const dcscale = []
	for (let qi = 0; qi < 64; qi++) {
		dcscale.push(packet.data.getBits(offset, nbits))
		offset += nbits
	}

	// 6.4.2 5-6
	const nbms = 1 + packet.data.getBits(offset, 9)
	offset += 9

	const bms = []
	for (let bmi = 0; bmi < nbms; bmi++) {
		const acc = []
		for (let ci = 0; ci < 64; ci++) {
			acc.push(packet.data.getBits(offset, 8))
			offset += 8
		}
		bms.push(acc)
	}

	// 6.4.2 7
	const nqrs: number[][] = []
	const qrsizes: number[][][] = []
	const qrbmis: number[][][] = []

	for (let qti = 0; qti < 2; qti++) {
		nqrs.push([])
		qrsizes.push([])
		qrbmis.push([])
		for (let pli = 0; pli < 3; pli++) {
			// 6.4.2 7.a.i-ii
			let newqr = 1
			if (qti > 0 || pli > 0) {
				newqr = packet.data.getBits(offset, 1)
				offset += 1
			}

			// 6.4.2 7.a.iii
			if (newqr === 0) {
				// 7.a.iii.A-B
				let rpqr = 0
				if (qti > 0) {
					rpqr = packet.data.getBits(offset, 1)
					offset += 1
				}

				// 7.a.iii.C-D
				const qtj = rpqr === 1 ? qti - 1 : Math.floor((3 * qti + pli - 1) / 3)
				const plj = rpqr === 1 ? pli : (pli + 2) % 3

				nqrs[qti].push(nqrs[qtj][plj])
				qrsizes[qti].push(qrsizes[qtj][plj])
				qrbmis[qti].push(qrbmis[qtj][plj])
			}

			// 6.4.2 7.a.iv
			else {
				qrsizes[qti].push([])
				qrbmis[qti].push([])

				// 7.a.iv.A-B
				let qri = 0	
				let qi = 0

				// 7.a.iv.C
				nbits = ilog(nbms - 1)
				const qrbmi = packet.data.getBits(offset, nbits)
				offset += nbits
				qrbmis[qti][pli][qri] = qrbmi
				if (qrbmi >= nbms) return

				// 7.a.iv.H
				while (qi < 63) {
					// 7.a.iv.D
					nbits = ilog(62 - qi)
					const qrsize = 1 + packet.data.getBits(offset, nbits)
					offset += nbits
					qrsizes[qti][pli][qri] = qrsize

					// 7.a.iv.E-F
					qi += qrsize
					qri += 1

					// 7.a.iv.G
					nbits = ilog(nbms - 1)
					const qrbmi = packet.data.getBits(offset, nbits)
					offset += nbits
					qrbmis[qti][pli][qri] = qrbmi
				}

				// 7.a.iv.I
				if (qi > 63) return

				// 7.a.iv.J
				nqrs[qti][pli] = qri
			}
		}
	}

	// 6.4.5 4
	// 6.4.4 1
	const hts: [string, number][][] = []
	function decode(hbits: string, hti: number) {
		// 1.b
		if (hbits.length > 32) return true

		// 1.c
		const isleaf = packet.data.getBits(offset, 1)
		offset += 1

		// 1.d
		if (isleaf === 1) {
			if (hts[hti].length >= 32) return true
			const token = packet.data.getBits(offset, 5)
			offset += 5
			hts[hti].push([hbits, token])
		}
		// 1.e
		else {
			if (decode(hbits + '0', hti)) return true
			if (decode(hbits + '1', hti)) return true
		}
	}
	for (let hti = 0; hti < 80; hti++) {
		hts.push([])
		if (decode('', hti)) return
	}

	return {
		lflims,
		acscale,
		dcscale,
		nbms,
		bms,
		nqrs,
		qrsizes,
		qrbmis,
		hts
	}
}

export function decodeHeaders(stream: OggBitstream) {
	const identification = decodeIdentificationHeader(stream)
	const comments = decodeCommentsHeader(stream)
	const setup = decodeSetupHeader(stream)

	return {
		identification,
		comments,
		setup
	}
}

export function decodeFrame(stream: OggBitstream, index: number) {
	
}