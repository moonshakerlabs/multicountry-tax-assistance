/**
 * Fiscal Year Data per Country
 * Based on UN Government Fiscal Years data.
 * 
 * Each country has a fiscal year start month/day and end month/day.
 * Countries not listed default to calendar year (Jan 1 - Dec 31).
 */

export interface FiscalYearConfig {
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
  notes?: string;
}

// Country code → fiscal year config
// Country codes match ALL_COUNTRIES in countryLanguageData.ts
const FISCAL_YEAR_MAP: Record<string, FiscalYearConfig> = {
  // April 1 - March 31
  INDIA:        { startMonth: 4, startDay: 1, endMonth: 3, endDay: 31 },
  UK:           { startMonth: 4, startDay: 1, endMonth: 3, endDay: 31 },
  CANADA:       { startMonth: 4, startDay: 1, endMonth: 3, endDay: 31 },
  JAPAN:        { startMonth: 4, startDay: 1, endMonth: 3, endDay: 31 },
  SINGAPORE:    { startMonth: 4, startDay: 1, endMonth: 3, endDay: 31 },
  SOUTH_AFRICA: { startMonth: 4, startDay: 1, endMonth: 3, endDay: 31 },

  // July 1 - June 30
  AUSTRALIA:    { startMonth: 7, startDay: 1, endMonth: 6, endDay: 30 },

  // October 1 - September 30 (US federal)
  USA:          { startMonth: 10, startDay: 1, endMonth: 9, endDay: 30 },

  // Calendar year (Jan 1 - Dec 31) — explicitly listed for clarity
  GERMANY:      { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  FRANCE:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  SPAIN:        { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  ITALY:        { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  NETHERLANDS:  { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  SWITZERLAND:  { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  AUSTRIA:      { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  BELGIUM:      { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  UAE:          { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  BRAZIL:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  MEXICO:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  CHINA:        { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  SOUTH_KOREA:  { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  RUSSIA:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  POLAND:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  SWEDEN:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  NORWAY:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  DENMARK:      { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  IRELAND:      { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  PORTUGAL:     { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  GREECE:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
  TURKEY:       { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
};

const DEFAULT_FISCAL_YEAR: FiscalYearConfig = {
  startMonth: 1, startDay: 1, endMonth: 12, endDay: 31,
};

const MONTH_ABBREV = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Get the fiscal year configuration for a country.
 */
export function getFiscalYearConfig(countryCode: string): FiscalYearConfig {
  return FISCAL_YEAR_MAP[countryCode] || DEFAULT_FISCAL_YEAR;
}

/**
 * Check if a country uses calendar year (Jan-Dec).
 */
export function isCalendarYear(countryCode: string): boolean {
  const fy = getFiscalYearConfig(countryCode);
  return fy.startMonth === 1 && fy.endMonth === 12;
}

/**
 * Generate the fiscal year label for a given base year and country.
 * 
 * For calendar year countries: "2024"
 * For Apr-Mar countries (e.g. India): "Apr 2024 - Mar 2025"
 * For Jul-Jun countries (e.g. Australia): "Jul 2024 - Jun 2025"
 * For Oct-Sep countries (e.g. USA): "Oct 2024 - Sep 2025"
 */
export function getFiscalYearLabel(baseYear: number, countryCode: string): string {
  const fy = getFiscalYearConfig(countryCode);
  
  if (isCalendarYear(countryCode)) {
    return baseYear.toString();
  }
  
  const startMonthAbbrev = MONTH_ABBREV[fy.startMonth - 1];
  const endMonthAbbrev = MONTH_ABBREV[fy.endMonth - 1];
  const endYear = baseYear + 1;
  
  return `${startMonthAbbrev} ${baseYear} - ${endMonthAbbrev} ${endYear}`;
}

/**
 * Generate the fiscal year folder name for Google Drive.
 * Same as label but used for folder naming.
 */
export function getFiscalYearFolderName(baseYear: number, countryCode: string): string {
  return getFiscalYearLabel(baseYear, countryCode);
}

/**
 * Generate a list of fiscal year options for dropdowns.
 * Returns objects with { value, label } where value is the folder name.
 */
export function getFiscalYearOptions(countryCode: string, count: number = 10): Array<{ value: string; label: string }> {
  const currentYear = new Date().getFullYear();
  const fy = getFiscalYearConfig(countryCode);
  const currentMonth = new Date().getMonth() + 1;
  
  // Determine the latest fiscal year that has started
  let latestStartYear = currentYear;
  if (currentMonth < fy.startMonth) {
    latestStartYear = currentYear - 1;
  }
  
  const options: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < count; i++) {
    const year = latestStartYear - i;
    const label = getFiscalYearLabel(year, countryCode);
    options.push({ value: label, label });
  }
  
  return options;
}

/**
 * Convert a fiscal year label back to the folder name (same value).
 * This is a pass-through but provided for clarity.
 */
export function fiscalYearToFolderName(fiscalYearValue: string): string {
  return fiscalYearValue;
}
