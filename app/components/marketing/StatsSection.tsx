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
    return `+ ${Math.floor(countedNumber / 1000)} MIL`;
  }
  return `+ ${countedNumber}`;
};

const stats = [
  { value: "+ 14", label: "ANOS DE EXPERIÊNCIA" },
  { value: "+ 6 MIL", label: "PLACAS INSTALADAS" },
  { value: "+ 100", label: "CLIENTES CORPORATIVOS" },
  { value: "+ 1000", label: "CLIENTES ATENDIDOS" },
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
    <div className="flex flex-col items-center p-4">
      <h3 className="mb-2 text-5xl font-bold text-white md:text-6xl">{displayedValue}</h3>
      <div className="mb-4 h-1 w-16 bg-primary" />
      <p className="text-lg uppercase tracking-wide text-gray-300">{label}</p>
    </div>
  );
}

export const StatsSection = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden bg-gray-900 py-16 text-white md:py-24"
    >
      <img
        src="/solar-panels-roof.webp"
        alt="Painéis solares"
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div className="relative z-10 container mx-auto max-w-screen-xl px-4 text-center md:px-6">
        <div
          className={`flex flex-col items-center transition-all duration-1000 ease-out ${
            inView ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <p className="mb-12 max-w-3xl text-lg text-gray-200 md:text-xl">
            Com mais de 14 anos de experiência, a Thermal se orgulha de seus números e da confiança
            de seus clientes.
          </p>
          <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
