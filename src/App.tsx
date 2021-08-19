import React from "react";
import getServerFile from "./load-file";

function App() {

  React.useEffect(() => {
    getServerFile('/test.ogv').then(buffer => {
      (window as any).view = new DataView(buffer)
    })
  }, [])

  return (
    <video src="/test.ogv" />
  );
}

export default App;
