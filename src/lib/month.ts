export const MONTH_STORAGE_KEY = "attendease:selectedMonth";

export function getInitialMonth() {
  const today = new Date();
  const fallback = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(MONTH_STORAGE_KEY);
    if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
  } catch {
    // ignore storage errors
  }
  return fallback;
}

export function persistMonth(value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MONTH_STORAGE_KEY, value);
  } catch {
    // ignore storage errors
  }
}
