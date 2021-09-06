import * as React from "react";
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

export interface OggPageProps {
  className?: string
  file: ArrayBuffer
  byteOffset: number
  onHighlightChange?(highlight?: Hightlight): void
}

const OggPage: React.FC<OggPageProps> = ({ className = '', file, byteOffset, onHighlightChange }) => {
  const view = React.useMemo(() => new DataView(file, byteOffset), [file, byteOffset])

  const highlightEvents = (_byteOffset: number, bitLength: number) => {
    return {
      onMouseEnter: () => onHighlightChange && onHighlightChange({ byteOffset: _byteOffset + byteOffset, bitLength }),
      onMouseLeave: () => onHighlightChange && onHighlightChange()
    }
  }

  return (
    <div className={className}>
      <h2 className="font-bold text-xl mb-4">Ogg Page Decode</h2>
      <ol className="list-decimal pl-4">
        <li {...highlightEvents(0, 32)}>
          <p>
            <span className="font-bold">Capture Pattern</span>
            <span> (4 bytes) </span>
            <span>0x{toHex(view.getUint32(0), 8)}</span>
          </p>
          <p>The value 0x4F676753 in four bytes mark the beginning of a page. This value spells `OggS` in ASCII.</p>
        </li>
        <li {...highlightEvents(4, 8)}>
          <p>
            <span className="font-bold">Stream Structure Version</span>
            <span> (1 byte) </span>
            <span>0x{toHex(view.getUint8(4), 2)}</span>
          </p>
          <p>This is the version of the file format. The current specification is only for version 0.</p>
        </li>
        <li {...highlightEvents(5, 8)}>
          <p>
            <span className="font-bold">Header Type Flag</span>
            <span> (1 byte) </span>
            <span>0b{toBin(view.getUint8(5), 8)}</span>
          </p>
          <p>This bits in this field identify what kind of page this is.</p>
          <ul>
            <li>Bit 1: This page contains data from packet that continues from the previous page.</li>
            <li>Bit 2: This page is the first of a logical bitstream.</li>
            <li>Bit 3: This page is the last of a logical bitstream.</li>
          </ul>
        </li>
        <li {...highlightEvents(6, 64)}>
          <p>
            <span className="font-bold">Granule Position</span>
            <span> (8 bytes) </span>
            <span>0x{toHex(view.getUint32(6), 8)}{toHex(view.getUint32(10), 8)}</span>
          </p>
          <p>
            These bytes are used as a hint to the decoding progress after this page has been processed.
          </p>
        </li>
        <li {...highlightEvents(14, 32)}>
          <p>
            <span className="font-bold">Bitstream Serial Number</span>
            <span> (4 bytes) </span>
            <span>0x{toHex(view.getUint32(14), 8)}</span>
          </p>
          <p>
            All pages in the same logical bitstream share the same serial number.
          </p>
        </li>
        <li {...highlightEvents(18, 32)}>
          <p>
            <span className="font-bold">Page Sequence Number</span>
            <span> (4 bytes) </span>
            <span>0x{toHex(view.getUint32(18), 8)}</span>
          </p>
          <p>
            This indicates the page number within a logical bitstream.
            It should increase separately on each bitstream.
          </p>
        </li>
        <li {...highlightEvents(22, 32)}>
          <p>
            <span className="font-bold">CRC Checksum</span>
            <span> (4 bytes) </span>
            <span>0x{toHex(view.getUint32(22), 8)}</span>
          </p>
          <p>
            This value is used to determine whether this page has been corrupted.
          </p>
        </li>
      </ol> 
    </div>
  );
}

export default OggPage;

