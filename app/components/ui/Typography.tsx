import React from "react";

type Variant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body1" | "body2" | "subtitle1" | "subtitle2" | "caption" | "overline";

interface TypographyProps {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantTag: Record<Variant, keyof JSX.IntrinsicElements> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  body1: "p",
  body2: "p",
  subtitle1: "p",
  subtitle2: "p",
  caption: "span",
  overline: "span",
};

const variantClass: Record<Variant, string> = {
  h1: "text-4xl lg:text-5xl font-sansbold font-bold",
  h2: "text-2xl lg:text-3xl font-sansbold font-bold",
  h3: "text-xl lg:text-2xl font-sansbold font-semibold",
  h4: "text-lg lg:text-xl font-sansbold font-semibold",
  h5: "text-base lg:text-lg font-sansbold font-semibold",
  h6: "text-sm lg:text-base font-sansbold font-semibold",
  body1: "text-base",
  body2: "text-sm",
  subtitle1: "text-lg",
  subtitle2: "text-base",
  caption: "text-xs",
  overline: "text-xs uppercase tracking-widest",
};

const Typography: React.FC<TypographyProps> = ({ variant, children, className = "" }) => {
  const Tag = variantTag[variant];
  return <Tag className={`${variantClass[variant]} ${className}`}>{children}</Tag>;
};

export default Typography;
