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

// All countries - Germany, India, and UAE enabled for now
export const ALL_COUNTRIES: Country[] = [
  { code: 'GERMANY', nameEn: 'Germany', nameNative: 'Deutschland', enabled: true },
  { code: 'INDIA', nameEn: 'India', nameNative: 'भारत', enabled: true },
  { code: 'USA', nameEn: 'United States', nameNative: 'United States', enabled: true },
  { code: 'UK', nameEn: 'United Kingdom', nameNative: 'United Kingdom', enabled: true },
  { code: 'FRANCE', nameEn: 'France', nameNative: 'France', enabled: true },
  { code: 'SPAIN', nameEn: 'Spain', nameNative: 'España', enabled: true },
  { code: 'ITALY', nameEn: 'Italy', nameNative: 'Italia', enabled: true },
  { code: 'NETHERLANDS', nameEn: 'Netherlands', nameNative: 'Nederland', enabled: true },
  { code: 'SWITZERLAND', nameEn: 'Switzerland', nameNative: 'Schweiz', enabled: true },
  { code: 'AUSTRIA', nameEn: 'Austria', nameNative: 'Österreich', enabled: true },
  { code: 'BELGIUM', nameEn: 'Belgium', nameNative: 'België', enabled: true },
  { code: 'CANADA', nameEn: 'Canada', nameNative: 'Canada', enabled: true },
  { code: 'AUSTRALIA', nameEn: 'Australia', nameNative: 'Australia', enabled: true },
  { code: 'JAPAN', nameEn: 'Japan', nameNative: '日本', enabled: true },
  { code: 'CHINA', nameEn: 'China', nameNative: '中国', enabled: true },
  { code: 'SINGAPORE', nameEn: 'Singapore', nameNative: 'Singapore', enabled: true },
  { code: 'UAE', nameEn: 'United Arab Emirates', nameNative: 'الإمارات', enabled: true },
  { code: 'BRAZIL', nameEn: 'Brazil', nameNative: 'Brasil', enabled: true },
  { code: 'MEXICO', nameEn: 'Mexico', nameNative: 'México', enabled: true },
  { code: 'SOUTH_KOREA', nameEn: 'South Korea', nameNative: '대한민국', enabled: true },
  { code: 'RUSSIA', nameEn: 'Russia', nameNative: 'Россия', enabled: true },
  { code: 'POLAND', nameEn: 'Poland', nameNative: 'Polska', enabled: true },
  { code: 'SWEDEN', nameEn: 'Sweden', nameNative: 'Sverige', enabled: true },
  { code: 'NORWAY', nameEn: 'Norway', nameNative: 'Norge', enabled: true },
  { code: 'DENMARK', nameEn: 'Denmark', nameNative: 'Danmark', enabled: true },
  { code: 'IRELAND', nameEn: 'Ireland', nameNative: 'Éire', enabled: true },
  { code: 'PORTUGAL', nameEn: 'Portugal', nameNative: 'Portugal', enabled: true },
  { code: 'GREECE', nameEn: 'Greece', nameNative: 'Ελλάδα', enabled: true },
  { code: 'TURKEY', nameEn: 'Turkey', nameNative: 'Türkiye', enabled: true },
  { code: 'SOUTH_AFRICA', nameEn: 'South Africa', nameNative: 'South Africa', enabled: true },
];

// Languages by country - used to aggregate languages from all selected countries
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
  UAE: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
    { code: 'AR', nameEn: 'Arabic', nameNative: 'العربية', enabled: false },
  ],
  USA: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
    { code: 'ES', nameEn: 'Spanish', nameNative: 'Español', enabled: false },
  ],
  UK: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  FRANCE: [
    { code: 'FR', nameEn: 'French', nameNative: 'Français', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  SPAIN: [
    { code: 'ES', nameEn: 'Spanish', nameNative: 'Español', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  ITALY: [
    { code: 'IT', nameEn: 'Italian', nameNative: 'Italiano', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  SWITZERLAND: [
    { code: 'DE', nameEn: 'German', nameNative: 'Deutsch', enabled: true },
    { code: 'FR', nameEn: 'French', nameNative: 'Français', enabled: false },
    { code: 'IT', nameEn: 'Italian', nameNative: 'Italiano', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  AUSTRIA: [
    { code: 'DE', nameEn: 'German', nameNative: 'Deutsch', enabled: true },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  NETHERLANDS: [
    { code: 'NL', nameEn: 'Dutch', nameNative: 'Nederlands', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  BELGIUM: [
    { code: 'NL', nameEn: 'Dutch', nameNative: 'Nederlands', enabled: false },
    { code: 'FR', nameEn: 'French', nameNative: 'Français', enabled: false },
    { code: 'DE', nameEn: 'German', nameNative: 'Deutsch', enabled: true },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  JAPAN: [
    { code: 'JA', nameEn: 'Japanese', nameNative: '日本語', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  CHINA: [
    { code: 'ZH', nameEn: 'Chinese', nameNative: '中文', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  SINGAPORE: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
    { code: 'ZH', nameEn: 'Chinese', nameNative: '中文', enabled: false },
    { code: 'MS', nameEn: 'Malay', nameNative: 'Bahasa Melayu', enabled: false },
    { code: 'TA', nameEn: 'Tamil', nameNative: 'தமிழ்', enabled: false },
  ],
  BRAZIL: [
    { code: 'PT', nameEn: 'Portuguese', nameNative: 'Português', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  MEXICO: [
    { code: 'ES', nameEn: 'Spanish', nameNative: 'Español', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  SOUTH_KOREA: [
    { code: 'KO', nameEn: 'Korean', nameNative: '한국어', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  RUSSIA: [
    { code: 'RU', nameEn: 'Russian', nameNative: 'Русский', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  POLAND: [
    { code: 'PL', nameEn: 'Polish', nameNative: 'Polski', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  SWEDEN: [
    { code: 'SV', nameEn: 'Swedish', nameNative: 'Svenska', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  NORWAY: [
    { code: 'NO', nameEn: 'Norwegian', nameNative: 'Norsk', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  DENMARK: [
    { code: 'DA', nameEn: 'Danish', nameNative: 'Dansk', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  IRELAND: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
    { code: 'GA', nameEn: 'Irish', nameNative: 'Gaeilge', enabled: false },
  ],
  PORTUGAL: [
    { code: 'PT', nameEn: 'Portuguese', nameNative: 'Português', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  GREECE: [
    { code: 'EL', nameEn: 'Greek', nameNative: 'Ελληνικά', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  TURKEY: [
    { code: 'TR', nameEn: 'Turkish', nameNative: 'Türkçe', enabled: false },
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
  SOUTH_AFRICA: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
    { code: 'AF', nameEn: 'Afrikaans', nameNative: 'Afrikaans', enabled: false },
    { code: 'ZU', nameEn: 'Zulu', nameNative: 'isiZulu', enabled: false },
  ],
  CANADA: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
    { code: 'FR', nameEn: 'French', nameNative: 'Français', enabled: false },
  ],
  AUSTRALIA: [
    { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
  ],
};

// Default languages for countries without specific mappings
export const DEFAULT_LANGUAGES: Language[] = [
  { code: 'EN', nameEn: 'English', nameNative: 'English', enabled: true },
];

// Get languages for a single country
export function getLanguagesForCountry(countryCode: string): Language[] {
  return LANGUAGES_BY_COUNTRY[countryCode] || DEFAULT_LANGUAGES;
}

// Get combined languages from multiple countries (primary + other tax countries)
export function getLanguagesForCountries(primaryCountry: string, otherCountries: string[] = []): Language[] {
  const allCountries = [primaryCountry, ...otherCountries];
  const languageMap = new Map<string, Language>();
  
  // Aggregate languages from all selected countries
  for (const country of allCountries) {
    const countryLanguages = LANGUAGES_BY_COUNTRY[country] || DEFAULT_LANGUAGES;
    for (const lang of countryLanguages) {
      // If language already exists, keep the one that's enabled
      const existing = languageMap.get(lang.code);
      if (!existing || (!existing.enabled && lang.enabled)) {
        languageMap.set(lang.code, lang);
      }
    }
  }
  
  // Convert to array and sort: enabled first, then by name
  const languages = Array.from(languageMap.values());
  languages.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.nameEn.localeCompare(b.nameEn);
  });
  
  return languages;
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
