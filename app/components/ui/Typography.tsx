import React from "react";

interface TypographyProps {
  variant: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body1" | "body2" | "subtitle1" | "subtitle2" | "caption" | "overline";
  children: React.ReactNode;
  className?: string;
}

const Typography: React.FC<TypographyProps> = ({ variant, children, className }) => {
  return <div className={className}>{children}</div>;
};

export default Typography;
