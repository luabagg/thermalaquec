import React from "react"

interface UnderlineProps {
    children: React.ReactNode;
}

export const Underline: React.FC<UnderlineProps> = ({ children }) => {
    return (
        <span className="shadow-xs-clean">
            {children}
        </span>
    )
}