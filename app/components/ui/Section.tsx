import React, { useState } from "react";

export const Section = function ({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
      w-full min-h-[75vh] py-20
      bg-gray-dark-900
    "
    >
      <div
        className="
        section-container
        break-words
        max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8
      "
      >
        {children}
      </div>
    </div>
  );
};

export const SectionTitle: React.FC<{ title: string }> = function ({ title }) {
  const [borderStyle, setBorderStyle] = useState("partial-b-opacity");

  return (
    <div
      className="w-full"
      onMouseEnter={() => setBorderStyle("partial-b-yellow")}
      onMouseLeave={() => setBorderStyle("partial-b-opacity")}
    >
      <div className="flex w-auto p-2 lg:p-6">
        <h1
          className={`
          text-4xl lg:text-5xl font-sansbold font-bold
          uppercase tracking-tight
          ${borderStyle}
        `}
        >
          {title} <span className="text-yellow">.</span>
        </h1>
      </div>
    </div>
  );
};

export const SectionContent: React.FC<{ description: React.ReactNode; children: React.ReactNode }> = function ({
  description,
  children,
}) {
  return (
    <div className="px-2 sm:pl-8">
      <p className="text-base text-gray-300">{description}</p>
      {children}
    </div>
  );
};
