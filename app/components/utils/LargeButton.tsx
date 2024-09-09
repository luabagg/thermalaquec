import * as React from 'react';
import { Button } from "@mui/base";

export const LargeButton: React.FC<
{ children: React.ReactNode, href?: string, onclick?: React.MouseEventHandler }
> = ({ children, href, onclick }) => {
    return (
        <Button href={href} onClick={onclick} className="
            w-40 py-2 md:w-48 md:py-3
            rounded-sm shadow-inset-clean
            uppercase tracking-widest
            text-center text-xs leading-3
            font-sansbold font-extrabold
            bg-red-dark hover:bg-yellow
            text-white hover:text-ebony
            transition-colors ease-out duration-500
        ">
            {children}
        </Button>
    )
}
