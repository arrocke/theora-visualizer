import React from "react";
import getServerFile from "./load-file";
import { decodePages } from "./ogg";

function App() {

  React.useEffect(() => {
    getServerFile('/test.ogv').then(buffer => {
      const pages = decodePages(buffer)
      console.log(pages)
      ;(window as any).view = new DataView(buffer)
    })
  }, [])

  return (
    <video src="/test.ogv" />
  );
}

export default App;
