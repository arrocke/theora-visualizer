import * as React from "react";
import FileStream from "./FileStream";
import getServerFile from "./load-file";


function App() {
  const [file, setFile] = React.useState<ArrayBuffer>()
  const [byteOffset, setByteOffset] = React.useState(0)

  React.useEffect(() => {
    getServerFile('/test.ogv').then(buffer => {
      ;(window as any).view = new DataView(buffer)
      setFile(buffer)
    })
  }, [])

  return (
    <div>
      {file && <div className="flex">
        <button onClick={() => setByteOffset(x => Math.max(x - 1, 0))}>Back</button>
        <FileStream file={file} byteOffset={byteOffset} className="m-2 w-full" />
        <button onClick={() => setByteOffset(x => Math.min(x + 1, file.byteLength - 1))}>Forward</button>
      </div>}
    </div>
  );
}

export default App;
