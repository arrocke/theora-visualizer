import React from "react";
import getServerFile from "./load-file";
import { decodeBitstreams } from "./ogg";
import { isTheoraBitstream } from "./theora";

function App() {

  React.useEffect(() => {
    getServerFile('/test.ogv').then(buffer => {
      const bitstreams = decodeBitstreams(buffer)
      const theoraStream = Object.values(bitstreams).find(isTheoraBitstream)
      console.log(theoraStream)
      ;(window as any).view = new DataView(buffer)
    })
  }, [])

  return (
    <video src="/test.ogv" />
  );
}

export default App;
