// Category data index - exports all country-specific categories
// Add new country files here as they are created

import { GERMANY_CATEGORIES, getGermanyMainCategories, getGermanySubCategories } from './germany';
import { INDIA_CATEGORIES, getIndiaMainCategories, getIndiaSubCategories } from './india';
import { UAE_CATEGORIES, getUAEMainCategories, getUAESubCategories } from './uae';

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

// Get category label based on language preference
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
