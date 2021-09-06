import * as React from "react";
import FileStream from "./FileStream";
import * as Ogg from './ogg'
import * as Theora from './theora'
import getServerFile from "./load-file";
import OggPage from "./OggPage";
import Hightlight from "./Highlight";

function toHex(n: number, digits?: number): string {
  const str = n.toString(16).toUpperCase()
  const size = digits ?? 2 * Math.ceil(str.length / 2)
  return str.padStart(size, '0')
}
function toBin(n: number, digits?: number): string {
  const str = n.toString(2).toUpperCase()
  const size = digits ?? 8 * Math.ceil(str.length / 8)
  return str.padStart(size, '0')
}

function App() {
  const [file, setFile] = React.useState<ArrayBuffer | undefined>()
  const [byteOffset, setByteOffset] = React.useState(0)
  const [highlight, setHighlight] = React.useState<Hightlight | undefined>()

  // Decode the file when it changes.
  const data = React.useMemo(() => {
    if (file) {
    const view = new DataView(file)
    const pages = Ogg.decodePages(file)
    const bitstreams = Ogg.decodeBitstreams(pages)
    const theoraStream = Object.values(bitstreams).find(Theora.isTheoraBitstream)
    const headers = Theora.decodeHeaders(theoraStream)
    return { view, pages, bitstreams, theoraStream, headers }
    }
  }, [file])

  React.useEffect(() => {
    getServerFile('/test.ogv').then(buffer => {
      ;(window as any).view = new DataView(buffer)
      setFile(buffer)
    })
  }, [])

  return (
    <div className="w-screen h-screen">
      {file && data && <div className="flex h-full">
        <FileStream file={file} byteOffset={byteOffset} highlight={highlight} className="h-full flex-shrink-0" />
        <OggPage className="ml-4" file={file} byteOffset={byteOffset} onHighlightChange={setHighlight} />
      </div>}
    </div>
  );
}

export default App;
