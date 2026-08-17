import { useEffect, useState } from "react";

function readOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function useConnectivity() {
  const [online, setOnline] = useState(readOnline);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  return online;
}
