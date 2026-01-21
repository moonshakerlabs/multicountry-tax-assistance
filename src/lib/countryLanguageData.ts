// Country and Language data for Profile and Document Vault

export interface Country {
  code: string;
  nameEn: string;
  nameNative: string;
  enabled: boolean;
}

export interface Language {
  code: string;
  nameEn: string;
  nameNative: string;
  enabled: boolean;
}

// All countries - only Germany and India enabled for now
export const ALL_COUNTRIES: Country[] = [
  { code: 'GERMANY', nameEn: 'Germany', nameNative: 'Deutschland', enabled: true },
  { code: 'INDIA', nameEn: 'India', nameNative: 'भारत', enabled: true },
  { code: 'USA', nameEn: 'United States', nameNative: 'United States', enabled: false },
  { code: 'UK', nameEn: 'United Kingdom', nameNative: 'United Kingdom', enabled: false },
  { code: 'FRANCE', nameEn: 'France', nameNative: 'France', enabled: false },
  { code: 'SPAIN', nameEn: 'Spain', nameNative: 'España', enabled: false },
  { code: 'ITALY', nameEn: 'Italy', nameNative: 'Italia', enabled: false },
  { code: 'NETHERLANDS', nameEn: 'Netherlands', nameNative: 'Nederland', enabled: false },
  { code: 'SWITZERLAND', nameEn: 'Switzerland', nameNative: 'Schweiz', enabled: false },
  { code: 'AUSTRIA', nameEn: 'Austria', nameNative: 'Österreich', enabled: false },
  { code: 'BELGIUM', nameEn: 'Belgium', nameNative: 'België', enabled: false },
  { code: 'CANADA', nameEn: 'Canada', nameNative: 'Canada', enabled: false },
  { code: 'AUSTRALIA', nameEn: 'Australia', nameNative: 'Australia', enabled: false },
  { code: 'JAPAN', nameEn: 'Japan', nameNative: '日本', enabled: false },
  { code: 'CHINA', nameEn: 'China', nameNative: '中国', enabled: false },
  { code: 'SINGAPORE', nameEn: 'Singapore', nameNative: 'Singapore', enabled: false },
  { code: 'UAE', nameEn: 'United Arab Emirates', nameNative: 'الإمارات', enabled: false },
  { code: 'BRAZIL', nameEn: 'Brazil', nameNative: 'Brasil', enabled: false },
  { code: 'MEXICO', nameEn: 'Mexico', nameNative: 'México', enabled: false },
  { code: 'SOUTH_KOREA', nameEn: 'South Korea', nameNative: '대한민국', enabled: false },
  { code: 'RUSSIA', nameEn: 'Russia', nameNative: 'Россия', enabled: false },
  { code: 'POLAND', nameEn: 'Poland', nameNative: 'Polska', enabled: false },
  { code: 'SWEDEN', nameEn: 'Sweden', nameNative: 'Sverige', enabled: false },
  { code: 'NORWAY', nameEn: 'Norway', nameNative: 'Norge', enabled: false },
  { code: 'DENMARK', nameEn: 'Denmark', nameNative: 'Danmark', enabled: false },
  { code: 'IRELAND', nameEn: 'Ireland', nameNative: 'Éire', enabled: false },
  { code: 'PORTUGAL', nameEn: 'Portugal', nameNative: 'Portugal', enabled: false },
  { code: 'GREECE', nameEn: 'Greece', nameNative: 'Ελλάδα', enabled: false },
  { code: 'TURKEY', nameEn: 'Turkey', nameNative: 'Türkiye', enabled: false },
  { code: 'SOUTH_AFRICA', nameEn: 'South Africa', nameNative: 'South Africa', enabled: false },
];

// Languages by primary tax residency
export const LANGUAGES_BY_COUNTRY: Record<string, Language[]> = {
  GERMANY: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
    { code: 'DE', nameEn: 'German', nameNative: 'Deutsch', enabled: true },
    { code: 'FR', nameEn: 'French', nameNative: 'Français', enabled: false },
    { code: 'TR', nameEn: 'Turkish', nameNative: 'Türkçe', enabled: false },
    { code: 'ES', nameEn: 'Spanish', nameNative: 'Español', enabled: false },
    { code: 'IT', nameEn: 'Italian', nameNative: 'Italiano', enabled: false },
  ],
  INDIA: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
    { code: 'HI', nameEn: 'Hindi', nameNative: 'हिन्दी', enabled: false },
    { code: 'TE', nameEn: 'Telugu', nameNative: 'తెలుగు', enabled: false },
    { code: 'TA', nameEn: 'Tamil', nameNative: 'தமிழ்', enabled: false },
    { code: 'KN', nameEn: 'Kannada', nameNative: 'ಕನ್ನಡ', enabled: false },
  ],
};

// Default languages for countries without specific mappings
export const DEFAULT_LANGUAGES: Language[] = [
  { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
];

export function getLanguagesForCountry(countryCode: string): Language[] {
  return LANGUAGES_BY_COUNTRY[countryCode] || DEFAULT_LANGUAGES;
}

export function getCountryDisplayName(code: string, showNative = true): string {
  const country = ALL_COUNTRIES.find(c => c.code === code);
  if (!country) return code;
  return showNative && country.nameNative !== country.nameEn 
    ? `${country.nameEn} (${country.nameNative})`
    : country.nameEn;
}

export function getLanguageDisplayName(code: string, languages: Language[]): string {
  const lang = languages.find(l => l.code === code);
  if (!lang) return code;
  return lang.nameNative !== lang.nameEn 
    ? `${lang.nameNative} (${lang.nameEn})`
    : lang.nameEn;
}

// Get other countries options (exclude primary tax residency)
export function getOtherCountriesOptions(primaryCountry: string): Country[] {
  return ALL_COUNTRIES.filter(c => c.code !== primaryCountry);
}
