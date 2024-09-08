import { Box } from '@mui/material';
import { Link } from '@remix-run/react';
import * as React from 'react';

export default function NavLink({ children, href, active = false }: { children: React.ReactNode, href: string, active: boolean }) {
    const applyActive = active ? "text-yellow" : "";

    return (
        <Box className={`
            flex h-full p-1 items-center
            uppercase tracking-widest
            text-xs leading-3
            font-sansbold font-extrabold
            hover:text-yellow
            transition-colors ease-out duration-250
            ${applyActive}
          `}>

            <Link to={href} >
                {children}
            </Link>
        </Box>
    )
}