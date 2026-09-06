import { useInView } from "react-intersection-observer";
import { useCountUp } from "~/hooks/use-count-up";

const parseStatValue = (value: string): number => {
  const cleanedValue = value.replace(/[^\d]/g, "");
  let num = parseInt(cleanedValue, 10);
  if (value.includes("MIL")) {
    num *= 1000;
  }
  return num;
};

const formatCountedValue = (originalValue: string, countedNumber: number): string => {
  if (originalValue.includes("MIL")) {
    return `+${Math.floor(countedNumber / 1000)} mil`;
  }
  return `+${countedNumber}`;
};

const stats = [
  { value: "+ 14", label: "Anos de experiência" },
  { value: "+ 6 MIL", label: "Placas instaladas" },
  { value: "+ 100", label: "Clientes corporativos" },
  { value: "+ 1000", label: "Clientes atendidos" },
];

function StatItem({
  value,
  label,
  inView,
}: {
  value: string;
  label: string;
  inView: boolean;
}) {
  const targetNumber = parseStatValue(value);
  const countedValue = useCountUp({ end: targetNumber, startOnInView: true, inView });
  const displayedValue = formatCountedValue(value, countedValue);

  return (
    <div className="flex flex-col items-start text-left">
      <h3 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
        {displayedValue}
      </h3>
      <div className="mt-3 h-0.5 w-10 bg-heat" />
      <p className="mt-3 font-sans text-sm font-medium text-zinc-300 md:text-base">
        {label}
      </p>
    </div>
  );
}

export const StatsSection = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.15,
  });

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden bg-ink py-16 text-white md:py-24"
    >
      <img
        src="/solar-panels-roof.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-25"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-ink/70" />
      <div className="relative z-10 container mx-auto max-w-screen-xl px-4 md:px-6">
        <div
          className={`transition-all duration-700 ease-thermal ${
            inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-12 max-w-2xl text-lg leading-relaxed text-zinc-200 md:text-xl">
            Escala e consistência em projetos de solar e aquecimento no Rio
            Grande do Sul e em Santa Catarina.
          </p>
          <div className="grid w-full grid-cols-2 gap-10 lg:grid-cols-4 lg:gap-8">
            {stats.map((stat) => (
              <StatItem
                key={stat.label}
                value={stat.value}
                label={stat.label}
                inView={inView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
