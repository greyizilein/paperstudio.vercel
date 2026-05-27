import "@/styles/czar-editor.css";
import { useEffect, useState } from "react";
import { CzarDesktop } from "@/components/czar-editor/EditorDesktop";
import { CzarMobile } from "@/components/czar-editor/EditorMobile";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function CzarEditor() {
  const isMobile = useIsMobile();

  return (
    <div style={{ width: "100vw", height: "100dvh", overflow: "hidden" }}>
      {isMobile ? <CzarMobile /> : <CzarDesktop />}
    </div>
  );
}
