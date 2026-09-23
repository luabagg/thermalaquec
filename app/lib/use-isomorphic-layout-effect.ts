import { useEffect, useLayoutEffect } from "react";

/** useLayoutEffect in the browser, useEffect on the server, where layout effects never run and React warns. */
export const useIsomorphicLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;
