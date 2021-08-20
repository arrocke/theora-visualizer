import React from "react";
import getServerFile from "./load-file";
import { decodeBitstreams } from "./ogg";
import { decodeHeaders, isTheoraBitstream } from "./theora";

function App() {

  React.useEffect(() => {
    getServerFile('/test.ogv').then(buffer => {
      const bitstreams = decodeBitstreams(buffer)
      const theoraStream = Object.values(bitstreams).find(isTheoraBitstream)
      const headers = decodeHeaders(theoraStream)
      console.log(headers)
      ;(window as any).stream = theoraStream
      ;(window as any).view = new DataView(buffer)
    })
  }, [])

  return (
    <video src="/test.ogv" />
  );
}

export default App;
