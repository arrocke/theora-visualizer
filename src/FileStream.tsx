import * as React from 'react'
import * as Ogg from './ogg'
import * as Theora from './theora'

const BYTE_UI_WIDTH = 57.8
const BIT_UI_WIDTH = BYTE_UI_WIDTH / 8

export interface FileStreamProps {
  className?: string
  file: ArrayBuffer
  byteOffset: number,
}

function createOggHighlights(byteOffset: number) {
  return [
    { byteOffset: byteOffset, bitLength: 32 },
    { byteOffset: byteOffset + 4, bitLength: 8 },
    { byteOffset: byteOffset + 5, bitLength: 8 },
    { byteOffset: byteOffset + 6, bitLength: 64 },
    { byteOffset: byteOffset + 14, bitLength: 32 },
    { byteOffset: byteOffset + 18, bitLength: 32 },
    { byteOffset: byteOffset + 22, bitLength: 32 },
    { byteOffset: byteOffset + 26, bitLength: 8 },
  ]
}

function toHex(n: number): string {
  const str = n.toString(16).toUpperCase()
  const size = Math.ceil(str.length / 2)
  return `0x${str.padStart(2 * size, '0')}`
}
function toBin(n: number): string {
  const str = n.toString(2).toUpperCase()
  const size = Math.ceil(str.length / 8)
  return `${str.padStart(8 * size, '0')}`
}

const FileStream: React.FunctionComponent<FileStreamProps> = ({ className = '', file, byteOffset }: FileStreamProps) => {
  // Decode the file when it changes.
  const { view, pages, bitstreams, theoraStream, headers } = React.useMemo(() => {
    const view = new DataView(file)
    const pages = Ogg.decodePages(file)
    const bitstreams = Ogg.decodeBitstreams(pages)
    const theoraStream = Object.values(bitstreams).find(Theora.isTheoraBitstream)
    const headers = Theora.decodeHeaders(theoraStream)
    return { view, pages, bitstreams, theoraStream, headers }
  }, [file])

  // Calculate the number of visible bytes when the root element resizes.
  const [byteLength, setByteLength] = React.useState(BYTE_UI_WIDTH * 10)
  const measureWidth = React.useMemo(() => {
    const observer = new ResizeObserver((entries) => {
      setByteLength(Math.ceil(entries[0].target.clientWidth / BYTE_UI_WIDTH))
    })
    return (el: HTMLElement | null) => {
      observer.disconnect()
      if (el) {
        observer.observe(el)
      }
    }
  }, [])

  // Store the current bytes from the buffer for rendering.
  const [bytes, setBytes] = React.useState<number[]>([])
  React.useEffect(() => {
    setBytes(Array.from({ length: byteLength }, (_, i) => view.getUint8(byteOffset + i)))
  }, [view, byteOffset, byteLength])

  const isVisible = React.useCallback(
    (elementByteOffset: number, elementBitLength: number): boolean => 
      elementByteOffset <= byteOffset + byteLength && elementByteOffset + elementBitLength / 8 >= byteOffset,
    [byteOffset, byteLength]
  )

  const highlights = [
    ...pages.flatMap(page => createOggHighlights(page.byteOffset))
  ]

  console.log(pages.filter(page => isVisible(page.byteOffset, page.size * 8)))

  return <div ref={measureWidth} className={`relative grid auto-cols-max overflow-hidden font-mono ${className}`}>
    {
      bytes.map((byte, i) => <>
        <div
          className="row-start-1 font-light text-xs text-gray-600"
          key={`byte-index-${byteOffset + i}`}
        >
          {toHex(byteOffset + i)}
        </div>
        <div
          className="row-start-2 text-xs"
          key={`byte-hex-${byteOffset + i}`}
        >
          {toHex(byte)}
        </div>
        <div
          className="row-start-3 z-10 pb-1 text-xs"
          key={`byte-bin-${byteOffset + i}`}
        >
          {toBin(byte)}
        </div>
      </>)
    }
    {

    }
    <div className="absolute top-9 left-0 h-6 w-full">
      {
        highlights
          .filter(highlight => isVisible(highlight.byteOffset, highlight.bitLength))
          .map((highlight, i) =>
            <div
              key={`highlight-${highlight.byteOffset}`}
              className={`
                absolute h-full border-b-4 box-border
                ${i % 3 === 0 ? 'bg-blue-300 border-blue-600' : '' }
                ${i % 3 === 1 ? 'bg-yellow-300 border-yellow-600' : '' }
                ${i % 3 === 2 ? 'bg-green-300 border-green-600' : '' }
              `}
              style={{
                left: (8 * (highlight.byteOffset - byteOffset)) * BIT_UI_WIDTH,
                width: highlight.bitLength * BIT_UI_WIDTH
              }}
            />
          )
      }
    </div>
  </div>
}

export default FileStream