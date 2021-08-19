export default async function getServerFile(file: string): Promise<ArrayBuffer> {
 	const response = await fetch(file)
	return await response.arrayBuffer()
}