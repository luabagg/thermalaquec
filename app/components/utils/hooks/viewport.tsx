import { useEffect, useState } from "react"

export const useViewport = (): number => {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        setWidth(window.outerWidth)
    }, [setWidth]);

    return width
}