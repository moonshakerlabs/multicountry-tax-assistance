// UAE Tax Document Categories
// Note: UAE has no personal income tax, but these are document categories for:
// - Residency proof, business, real estate, and international compliance

export interface SubCategory {
  code: string;
  labelEn: string;
  labelAr?: string;
}

export interface MainCategory {
  code: string;
  labelEn: string;
  labelAr?: string;
  subCategories: SubCategory[];
}

export const UAE_CATEGORIES: MainCategory[] = [
  {
    code: 'RESIDENCY_VISA',
    labelEn: 'Residency & Visa',
    labelAr: 'الإقامة والتأشيرة',
    subCategories: [
      { code: 'EMIRATES_ID', labelEn: 'Emirates ID', labelAr: 'هوية الإمارات' },
      { code: 'RESIDENCE_VISA', labelEn: 'Residence Visa', labelAr: 'تأشيرة الإقامة' },
      { code: 'PASSPORT_COPY', labelEn: 'Passport Copy', labelAr: 'نسخة جواز السفر' },
      { code: 'VISA_STAMP', labelEn: 'Visa Stamp', labelAr: 'ختم التأشيرة' },
    ],
  },
  {
    code: 'EMPLOYMENT',
    labelEn: 'Employment',
    labelAr: 'التوظيف',
    subCategories: [
      { code: 'EMPLOYMENT_CONTRACT', labelEn: 'Employment Contract', labelAr: 'عقد العمل' },
      { code: 'SALARY_CERTIFICATE', labelEn: 'Salary Certificate', labelAr: 'شهادة الراتب' },
      { code: 'SALARY_SLIPS', labelEn: 'Salary Slips', labelAr: 'قسائم الراتب' },
      { code: 'END_OF_SERVICE', labelEn: 'End of Service Gratuity', labelAr: 'مكافأة نهاية الخدمة' },
      { code: 'NOC_LETTER', labelEn: 'NOC Letter', labelAr: 'خطاب عدم ممانعة' },
    ],
  },
  {
    code: 'BUSINESS_TRADE',
    labelEn: 'Business & Trade License',
    labelAr: 'الأعمال والرخصة التجارية',
    subCategories: [
      { code: 'TRADE_LICENSE', labelEn: 'Trade License', labelAr: 'الرخصة التجارية' },
      { code: 'COMMERCIAL_REGISTRATION', labelEn: 'Commercial Registration', labelAr: 'السجل التجاري' },
      { code: 'MEMORANDUM_OF_ASSOCIATION', labelEn: 'Memorandum of Association', labelAr: 'عقد التأسيس' },
      { code: 'SHARE_CERTIFICATE', labelEn: 'Share Certificate', labelAr: 'شهادة الأسهم' },
      { code: 'AUDITED_FINANCIALS', labelEn: 'Audited Financial Statements', labelAr: 'البيانات المالية المدققة' },
    ],
  },
  {
    code: 'REAL_ESTATE',
    labelEn: 'Real Estate',
    labelAr: 'العقارات',
    subCategories: [
      { code: 'TITLE_DEED', labelEn: 'Title Deed', labelAr: 'سند الملكية' },
      { code: 'TENANCY_CONTRACT', labelEn: 'Tenancy Contract (Ejari)', labelAr: 'عقد الإيجار (إيجاري)' },
      { code: 'PROPERTY_PURCHASE_AGREEMENT', labelEn: 'Property Purchase Agreement', labelAr: 'اتفاقية شراء العقار' },
      { code: 'RENTAL_INCOME_STATEMENT', labelEn: 'Rental Income Statement', labelAr: 'بيان إيرادات الإيجار' },
    ],
  },
  {
    code: 'BANKING_FINANCE',
    labelEn: 'Banking & Finance',
    labelAr: 'البنوك والتمويل',
    subCategories: [
      { code: 'BANK_STATEMENTS', labelEn: 'Bank Statements', labelAr: 'كشوف الحساب البنكي' },
      { code: 'INVESTMENT_STATEMENTS', labelEn: 'Investment Statements', labelAr: 'كشوف الاستثمار' },
      { code: 'LOAN_DOCUMENTS', labelEn: 'Loan Documents', labelAr: 'وثائق القرض' },
      { code: 'CREDIT_CARD_STATEMENTS', labelEn: 'Credit Card Statements', labelAr: 'كشوف بطاقة الائتمان' },
    ],
  },
  {
    code: 'VAT_CORPORATE_TAX',
    labelEn: 'VAT & Corporate Tax',
    labelAr: 'ضريبة القيمة المضافة وضريبة الشركات',
    subCategories: [
      { code: 'VAT_REGISTRATION', labelEn: 'VAT Registration Certificate', labelAr: 'شهادة تسجيل ضريبة القيمة المضافة' },
      { code: 'VAT_RETURNS', labelEn: 'VAT Returns', labelAr: 'إقرارات ضريبة القيمة المضافة' },
      { code: 'CORPORATE_TAX_REGISTRATION', labelEn: 'Corporate Tax Registration', labelAr: 'تسجيل ضريبة الشركات' },
      { code: 'TAX_RESIDENCY_CERTIFICATE', labelEn: 'Tax Residency Certificate', labelAr: 'شهادة الإقامة الضريبية' },
    ],
  },
  {
    code: 'INTERNATIONAL_COMPLIANCE',
    labelEn: 'International Tax Compliance',
    labelAr: 'الامتثال الضريبي الدولي',
    subCategories: [
      { code: 'CRS_FATCA_FORMS', labelEn: 'CRS / FATCA Forms', labelAr: 'نماذج CRS / FATCA' },
      { code: 'FOREIGN_TAX_FORMS', labelEn: 'Foreign Tax Forms', labelAr: 'نماذج الضرائب الأجنبية' },
      { code: 'SUBSTANCE_DECLARATION', labelEn: 'Economic Substance Declaration', labelAr: 'إعلان الجوهر الاقتصادي' },
      { code: 'UBO_DECLARATION', labelEn: 'Ultimate Beneficial Owner Declaration', labelAr: 'إعلان المستفيد النهائي' },
    ],
  },
  {
    code: 'PERSONAL_DOCUMENTS',
    labelEn: 'Personal Documents',
    labelAr: 'الوثائق الشخصية',
    subCategories: [
      { code: 'PASSPORT', labelEn: 'Passport', labelAr: 'جواز السفر' },
      { code: 'BIRTH_CERTIFICATE', labelEn: 'Birth Certificate', labelAr: 'شهادة الميلاد' },
      { code: 'MARRIAGE_CERTIFICATE', labelEn: 'Marriage Certificate', labelAr: 'عقد الزواج' },
      { code: 'POWER_OF_ATTORNEY', labelEn: 'Power of Attorney', labelAr: 'توكيل رسمي' },
    ],
  },
];

// Helper function to get all main categories
export function getUAEMainCategories(): { code: string; labelEn: string; labelAr?: string }[] {
  return UAE_CATEGORIES.map(cat => ({
    code: cat.code,
    labelEn: cat.labelEn,
    labelAr: cat.labelAr,
  }));
}

// Helper function to get sub categories for a main category
export function getUAESubCategories(mainCategoryCode: string): SubCategory[] {
  const category = UAE_CATEGORIES.find(c => c.code === mainCategoryCode);
  return category?.subCategories || [];
}

export default UAE_CATEGORIES;
