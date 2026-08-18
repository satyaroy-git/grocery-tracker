/**
 * Rounds a number to a fixed number of decimal places and strips
 * floating-point noise (e.g. 1.2999999999999998 -> 1.3, 0.30000000000000004
 * -> 0.3). Necessary because SQLite/JS float arithmetic on repeated
 * "currentQuantity = currentQuantity + ?" updates accumulates tiny binary
 * rounding errors over time - this is what caused restocked/decremented
 * quantities (common for kg/L items, e.g. add 0.5kg, later use 0.3kg) to
 * display as long, "incorrect-looking" decimals instead of the clean number
 * the user actually entered.
 *
 * 3 decimal places is enough precision for any realistic grocery quantity
 * (e.g. 0.001 kg / 1 gram) while still fully absorbing float noise, which
 * typically shows up 10+ digits deep.
 */
export function roundQuantity(value: number, decimals: number = 3): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Same rounding, but for money - 2 decimal places (paise/cents), and never
 * negative.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a quantity for display, trimming trailing zeroes so "2.000"
 * becomes "2" and "1.500" becomes "1.5", while still rounding away float
 * noise first.
 */
export function formatQuantity(value: number, decimals: number = 3): string {
  const rounded = roundQuantity(value, decimals);
  return rounded.toString();
}

/**
 * Formats a money/price value for display with EXACTLY 2 decimal places
 * (e.g. 6.500000000000001 -> "6.50", 199 -> "199.00"). Unlike
 * formatQuantity, this always shows 2 decimals rather than trimming
 * trailing zeroes, since prices conventionally display that way
 * (₹6.50, not ₹6.5).
 */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0.00';
  return roundMoney(value).toFixed(2);
}
