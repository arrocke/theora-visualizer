import * as React from 'react'
import Highlight from './Highlight'

const BYTE_UI_HEIGHT = 20
const BYTES_IN_ROW = 2

export interface FileStreamProps {
  className?: string
  file: ArrayBuffer
  byteOffset: number,
  highlight?: Highlight
}

function toHex(n: number, digits?: number): string {
  const str = n.toString(16).toUpperCase()
  const size = digits ?? 2 * Math.ceil(str.length / 2)
  return `0x${str.padStart(size, '0')}`
}
function toBin(n: number): string {
  const str = n.toString(2).toUpperCase()
  const size = Math.ceil(str.length / 8)
  return `${str.padStart(8 * size, '0')}`
}

const FileStream: React.FunctionComponent<FileStreamProps> = ({ className = '', file, byteOffset, highlight }: FileStreamProps) => {
  const indexDigits = file.byteLength.toString(16).length

  const view = React.useMemo(() => {
    return new DataView(file)
  }, [file])

  // Calculate the number of visible bytes when the root element resizes.
  const [windowSize, setWindowSize] = React.useState(10)
  const measureWidth = React.useMemo(() => {
    const observer = new ResizeObserver((entries) => {
      setWindowSize(BYTES_IN_ROW * Math.ceil(entries[0].target.clientHeight / BYTE_UI_HEIGHT))
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
    setBytes(Array.from({ length: windowSize }, (_, i) => view.getUint8(byteOffset + i)))
  }, [view, byteOffset, windowSize])

  const byteRows = bytes.reduce<{ [index: number]: number[] }>((groups, byte, i) => {
    const index = BYTES_IN_ROW * Math.floor((byteOffset + i) / BYTES_IN_ROW)
    if (!groups[index]) {
      groups[index] = []
    }
    groups[index].push(byte)
    return groups
  }, {})

  return <div ref={measureWidth} className={`relative font-mono ${className}`}>
    <div className="grid gap-x-3 auto-rows-max items-baseline">
      {
        Object.entries(byteRows).map(([index, bytes]) => 
          <>
            <div
              key={`index-${index}`}
              className="col-start-1 text-xs font-light"
            >
              {toHex(index as any, indexDigits)}
            </div>
            <div
              key={`index-${index}-bytes`}
              className="col-start-2 text-sm"
            >
              {bytes.map((byte, j) =>
                <span
                  key={`byte-${index + j}`}
                  className={j > 0 ? 'ml-1' : ''}
                >
                  {toHex(byte)}
                </span>
              )}
            </div>
            {/* <div
              key={`index-${index}-bits`}
              className="col-start-3 text-sm"
            >
              {bytes.map((byte, j) =>
                <span
                  key={`bits-${index + j}`}
                  className={j > 0 ? 'ml-1' : ''}
                >
                  {toBin(byte)}
                </span>
              )}
            </div> */}
          </>
        )
      }
    </div>
    {
      highlight && (() => {
        let byteLength = highlight.bitLength / 8
        const firstRow = BYTES_IN_ROW - (highlight.byteOffset % BYTES_IN_ROW)
        const rows = [
          Math.min(firstRow, byteLength)
        ]
        byteLength -= rows[0]
        rows.push(...Array.from({ length: byteLength / BYTES_IN_ROW }).map((_, i) => BYTES_IN_ROW))
        return (
          <div
            className="absolute h-5"
            style={{
              top: 20 * Math.floor(highlight.byteOffset / BYTES_IN_ROW),
              right: -4,
              width: 39.72 * BYTES_IN_ROW
            }}
          >
            {
              rows.map((row, i) => 
                <div
                  className="bg-blue-700 opacity-70 h-5"
                  style={{
                    marginLeft: 39.72 * (highlight.byteOffset % BYTES_IN_ROW),
                    width: row * 39.72
                  }}
                />
              )
            }
          </div>
        )
      })()
    }
  </div>
}

export default FileStream