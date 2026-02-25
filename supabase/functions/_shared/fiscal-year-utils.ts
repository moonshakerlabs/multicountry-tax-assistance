/**
 * Fiscal year utilities for edge functions.
 * Mirrors the logic in src/lib/fiscalYearData.ts for server-side use.
 */

interface FiscalYearConfig {
  startMonth: number;
  endMonth: number;
}

const FISCAL_YEAR_MAP: Record<string, FiscalYearConfig> = {
  INDIA:        { startMonth: 4, endMonth: 3 },
  UK:           { startMonth: 4, endMonth: 3 },
  CANADA:       { startMonth: 4, endMonth: 3 },
  JAPAN:        { startMonth: 4, endMonth: 3 },
  SINGAPORE:    { startMonth: 4, endMonth: 3 },
  SOUTH_AFRICA: { startMonth: 4, endMonth: 3 },
  AUSTRALIA:    { startMonth: 7, endMonth: 6 },
  USA:          { startMonth: 10, endMonth: 9 },
};

/**
 * Check if a country uses calendar year.
 */
export function isCalendarYearCountry(countryCode: string): boolean {
  return !FISCAL_YEAR_MAP[countryCode];
}

/**
 * The year value coming from the frontend is already the fiscal year label
 * (e.g. "Apr 2024 - Mar 2025" or "2024").
 * This function is used when the frontend sends a year value to be used as folder name.
 * It simply returns the value as-is since the frontend already formats it correctly.
 */
export function getFolderNameForYear(yearValue: string, _countryCode: string): string {
  return yearValue;
}
