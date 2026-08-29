import { afterEach, expect, test, vi } from "vitest";

const brlFormatterOptions = { style: "currency", currency: "BRL" } as const;

afterEach(() => {
  vi.restoreAllMocks();
});

test("formatBRL caches a single Intl.NumberFormat instance and preserves output", async () => {
  const RealNumberFormat = Intl.NumberFormat;
  const numberFormatSpy = vi.spyOn(Intl, "NumberFormat").mockImplementation(((locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) =>
    new RealNumberFormat(locales, options)) as typeof Intl.NumberFormat);

  const { formatBRL } = await import("./quotation");
  const referenceFormatter = new RealNumberFormat("pt-BR", brlFormatterOptions);

  expect(numberFormatSpy).toHaveBeenCalledTimes(1);
  expect(formatBRL(0)).toBe(referenceFormatter.format(0));
  expect(formatBRL(12345)).toBe(referenceFormatter.format(123.45));
  expect(formatBRL(-987)).toBe(referenceFormatter.format(-9.87));
  expect(numberFormatSpy).toHaveBeenCalledTimes(1);
});
