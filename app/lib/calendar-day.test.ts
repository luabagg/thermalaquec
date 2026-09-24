import { expect, test } from "vitest";

import { todayInBrazil } from "./calendar-day";

test("a quotation created late in the evening in Brazil is dated that day, not the next UTC day", () => {
  // 22:30 in São Paulo (UTC-3) is already 01:30 of the next day in UTC.
  expect(todayInBrazil(new Date("2026-09-24T01:30:00.000Z")).toISOString()).toBe("2026-09-23T00:00:00.000Z");
  expect(todayInBrazil(new Date("2026-09-23T03:30:00.000Z")).toISOString()).toBe("2026-09-23T00:00:00.000Z");
});
