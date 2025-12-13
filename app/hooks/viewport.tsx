import { useEffect, useState } from "react";
import { atom, useAtom } from "jotai";
const viewportWidthAtom = atom(0);

export const useViewport = (): number => {
  const [width, setWidth] = useAtom(viewportWidthAtom);

  useEffect(() => {
    const handleResize = () => setWidth(window.outerWidth);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [setWidth]);

  return width;
};
