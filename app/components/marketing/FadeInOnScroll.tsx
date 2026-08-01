import { useInView } from "react-intersection-observer";
import { ReactNode } from "react";

interface FadeInOnScrollProps {
  children: ReactNode;
  className?: string;
}

export const FadeInOnScroll = ({ children, className }: FadeInOnScrollProps) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <div
      ref={ref}
      className={`${className ?? ""} transition-all duration-700 ease-thermal ${
        inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      {children}
    </div>
  );
};