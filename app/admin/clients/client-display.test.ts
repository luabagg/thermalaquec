import { expect, test } from "vitest";

import { formatClientAddress, formatPhone } from "./client-display";

test("addresses print only the parts that exist", () => {
  const base = { street: null, number: null, complement: null, district: null, city: "Farroupilha", state: "RS" };

  expect(formatClientAddress(base)).toBe("Farroupilha/RS");
  expect(formatClientAddress({ ...base, street: "Rua A", number: "10", district: "Centro" })).toBe("Rua A, 10 - Centro, Farroupilha/RS");
  expect(formatPhone("54991553618")).toBe("(54) 99155-3618");
});
