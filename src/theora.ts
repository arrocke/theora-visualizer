import { OggBitstream } from "./ogg";

const MAGIC_NUMBER_1 = 0x7468
const MAGIC_NUMBER_2 = 0x656F
const MAGIC_NUMBER_3 = 0x7261

enum HeaderType {
	Identification = 0x80,
	Comment = 0x81,
	Setup = 0x82
}

export function isTheoraBitstream(stream: OggBitstream): boolean {
	const packet = stream.pages[0]?.packets[0]
	if (!packet) {
		return false
	}
	const magicNumber1 = packet.getUint16(1)
	const magicNumber2 = packet.getUint16(3)
	const magicNumber3 = packet.getUint16(5)
	return magicNumber1 === MAGIC_NUMBER_1 && magicNumber2 === MAGIC_NUMBER_2 && magicNumber3 === MAGIC_NUMBER_3
}