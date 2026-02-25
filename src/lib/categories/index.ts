// Category data index - exports all country-specific categories
// Add new country files here as they are created

import { GERMANY_CATEGORIES, getGermanyMainCategories, getGermanySubCategories } from './germany';
import { INDIA_CATEGORIES, getIndiaMainCategories, getIndiaSubCategories } from './india';
import { UAE_CATEGORIES, getUAEMainCategories, getUAESubCategories } from './uae';
import { LANGUAGES_BY_COUNTRY } from '@/lib/countryLanguageData';

export interface CategoryItem {
  code: string;
  labelEn: string;
  labelLocal?: string;
}

export interface SubCategoryItem {
  code: string;
  labelEn: string;
  labelLocal?: string;
}

// English-speaking countries where local language IS English
const ENGLISH_SPEAKING_COUNTRIES = ['USA', 'UK', 'INDIA', 'CANADA', 'AUSTRALIA', 'IRELAND', 'SINGAPORE', 'SOUTH_AFRICA'];

// Get main categories for a given country
export function getMainCategoriesForCountry(countryCode: string): CategoryItem[] {
  switch (countryCode) {
    case 'GERMANY':
      return getGermanyMainCategories().map(c => ({
        code: c.code,
        labelEn: c.labelEn,
        labelLocal: c.labelDe,
      }));
    case 'INDIA':
      return getIndiaMainCategories().map(c => ({
        code: c.code,
        labelEn: c.labelEn,
        labelLocal: c.labelHi,
      }));
    case 'UAE':
      return getUAEMainCategories().map(c => ({
        code: c.code,
        labelEn: c.labelEn,
        labelLocal: c.labelAr,
      }));
    default:
      return [];
  }
}

// Get sub categories for a given country and main category
export function getSubCategoriesForCountry(countryCode: string, mainCategoryCode: string): SubCategoryItem[] {
  switch (countryCode) {
    case 'GERMANY':
      return getGermanySubCategories(mainCategoryCode).map(c => ({
        code: c.code,
        labelEn: c.labelEn,
        labelLocal: c.labelDe,
      }));
    case 'INDIA':
      return getIndiaSubCategories(mainCategoryCode).map(c => ({
        code: c.code,
        labelEn: c.labelEn,
        labelLocal: c.labelHi,
      }));
    case 'UAE':
      return getUAESubCategories(mainCategoryCode).map(c => ({
        code: c.code,
        labelEn: c.labelEn,
        labelLocal: c.labelAr,
      }));
    default:
      return [];
  }
}

/**
 * Determine the primary local language code for a country (first non-EN language).
 */
function getCountryLocalLanguage(countryCode: string): string | null {
  const langs = LANGUAGES_BY_COUNTRY[countryCode];
  if (!langs) return null;
  const local = langs.find(l => l.code !== 'EN');
  return local ? local.code : null;
}

/**
 * Get the bilingual category label based on:
 * - profileLang: user's preferred language from profile (e.g. 'EN', 'DE')
 * - countryCode: the selected upload country
 * 
 * Rules:
 * 1. If profile lang is EN and country is non-English-speaking → show "Local (English)"
 * 2. If profile lang matches country's local language → show local only
 * 3. If profile lang is non-English and country is English-speaking → show "English (Local)"
 * 4. Default: show English only
 */
export function getCategoryLabelBilingual(
  item: CategoryItem | SubCategoryItem,
  profileLang: string,
  countryCode: string
): string {
  const isEnglishSpeakingCountry = ENGLISH_SPEAKING_COUNTRIES.includes(countryCode);
  const countryLocalLang = getCountryLocalLanguage(countryCode);
  const profileIsEn = profileLang === 'EN';
  const profileMatchesLocal = countryLocalLang && profileLang === countryLocalLang;

  // If the item has a local label
  if (item.labelLocal) {
    if (profileIsEn && !isEnglishSpeakingCountry) {
      // Profile is English, country is non-English → show both: "Local (English)"
      return `${item.labelLocal} (${item.labelEn})`;
    }
    if (profileMatchesLocal) {
      // Profile language matches country's local language → show local only
      return item.labelLocal;
    }
    if (!profileIsEn && isEnglishSpeakingCountry) {
      // Profile is non-English, country is English-speaking → show both: "English (profile won't have local for this country)"
      return item.labelEn;
    }
    if (!profileIsEn && !isEnglishSpeakingCountry) {
      // Profile is non-English (e.g. DE) and country is also non-English → show both
      return `${item.labelLocal} (${item.labelEn})`;
    }
  }

  // Default: English only
  return item.labelEn;
}

// Legacy function - kept for backward compatibility
export function getCategoryLabel(item: CategoryItem | SubCategoryItem, preferLocal: boolean): string {
  if (preferLocal && item.labelLocal) {
    return `${item.labelLocal} (${item.labelEn})`;
  }
  return item.labelEn;
}

// Export raw category data for reference
export {
  GERMANY_CATEGORIES,
  INDIA_CATEGORIES,
  UAE_CATEGORIES,
};