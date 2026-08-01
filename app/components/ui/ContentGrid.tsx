import * as React from "react";

type ContentGridProps = {
  items: Array<{ title: string; text: string }>;
  maxCols?: number;
};

const colsClass: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export const ContentGrid: React.FC<ContentGridProps> = ({ items, maxCols = 3 }) => {
  return (
    <div className="p-2 sm:p-6 pb-14">
      <div className={`w-full grid grid-cols-1 gap-4 sm:gap-6 ${colsClass[maxCols] ?? "md:grid-cols-3"}`}>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="p-8 sm:p-10 rounded-md bg-slate-dark-500 shadow-inset-clean"
          >
            <h2 className="text-2xl lg:text-3xl font-sansbold font-bold pb-4">{item.title}.</h2>
            <p className="text-sm text-gray-300">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
