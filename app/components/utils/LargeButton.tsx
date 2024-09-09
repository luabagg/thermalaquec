import * as React from 'react';
import { Button } from "@mui/base";

export function LargeButton({ children, href, onclick }: { children: React.ReactNode, href?: string, onclick?: React.MouseEventHandler }) {
    return (
        <Button href={href} onClick={onclick} className="
            w-48 py-4
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
