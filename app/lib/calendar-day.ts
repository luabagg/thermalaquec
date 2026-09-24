// A calendar day is stored as UTC midnight of that day, which is what a PostgreSQL DATE column keeps.
// Read and write it in UTC, never in the server or browser time zone.

/** Today's calendar day in Brazil. */
export function todayInBrazil(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
  return new Date(`${day}T00:00:00.000Z`);
}

/** Reads the "YYYY-MM-DD" value of a date input. */
export function parseCalendarDay(text: string): Date | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T00:00:00.000Z`) : undefined;
}

/** The "YYYY-MM-DD" value a date input shows. */
export function calendarDayInputValue(day: Date | string) {
  return new Date(day).toISOString().slice(0, 10);
}

/** "dd/mm/yy", as the printed quotation shows it. */
export function formatCalendarDayShort(day: Date | string) {
  const d = new Date(day);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function calendarDayYear(day: Date | string) {
  return new Date(day).getUTCFullYear();
}
