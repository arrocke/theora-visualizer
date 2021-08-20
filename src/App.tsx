import React from "react";
import getServerFile from "./load-file";
import { decodeBitstreams } from "./ogg";
import { decodeCommentsHeader, decodeIdentificationHeader, isTheoraBitstream } from "./theora";

function App() {

  React.useEffect(() => {
    getServerFile('/test.ogv').then(buffer => {
      const bitstreams = decodeBitstreams(buffer)
      const theoraStream = Object.values(bitstreams).find(isTheoraBitstream)
      const idHeader = decodeIdentificationHeader(theoraStream)
      const commentsHeader = decodeCommentsHeader(theoraStream)
      console.log(idHeader, commentsHeader)
      ;(window as any).stream = theoraStream
      ;(window as any).view = new DataView(buffer)
    })
  }, [])

  return (
    <video src="/test.ogv" />
  );
}

export default App;
