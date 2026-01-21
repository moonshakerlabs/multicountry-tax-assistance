// Germany Tax Document Categories
// Comprehensive list of tax-relevant document categories for Germany

export interface SubCategory {
  code: string;
  labelEn: string;
  labelDe: string;
}

export interface MainCategory {
  code: string;
  labelEn: string;
  labelDe: string;
  subCategories: SubCategory[];
}

export const GERMANY_CATEGORIES: MainCategory[] = [
  {
    code: 'INCOME',
    labelEn: 'Income',
    labelDe: 'Einkünfte',
    subCategories: [
      { code: 'SALARY_CERTIFICATE', labelEn: 'Salary Certificate', labelDe: 'Lohnsteuerbescheinigung' },
      { code: 'MONTHLY_PAYSLIPS', labelEn: 'Monthly Payslips', labelDe: 'Gehaltsabrechnungen' },
      { code: 'EMPLOYER_TAX_CERTIFICATE', labelEn: 'Employer Tax Certificate', labelDe: 'Arbeitgeberbescheinigung' },
      { code: 'BONUS_VARIABLE_PAY', labelEn: 'Bonus / Variable Pay', labelDe: 'Bonuszahlungen' },
      { code: 'SEVERANCE_PAY', labelEn: 'Severance Pay', labelDe: 'Abfindung' },
    ],
  },
  {
    code: 'PENSION_RETIREMENT',
    labelEn: 'Pension & Retirement',
    labelDe: 'Rente & Altersvorsorge',
    subCategories: [
      { code: 'PENSION_STATEMENT', labelEn: 'Pension Statement', labelDe: 'Rentenbescheinigung' },
      { code: 'PRIVATE_PENSION', labelEn: 'Private Pension', labelDe: 'Private Altersvorsorge' },
      { code: 'COMPANY_PENSION', labelEn: 'Company Pension', labelDe: 'Betriebsrente' },
      { code: 'FOREIGN_PENSION', labelEn: 'Foreign Pension', labelDe: 'Ausländische Rente' },
    ],
  },
  {
    code: 'CAPITAL_INVESTMENT',
    labelEn: 'Capital & Investment Income',
    labelDe: 'Kapital- & Investmenteinkünfte',
    subCategories: [
      { code: 'BANK_INTEREST', labelEn: 'Bank Interest', labelDe: 'Zinseinnahmen' },
      { code: 'DIVIDEND_STATEMENTS', labelEn: 'Dividend Statements', labelDe: 'Dividendenerträge' },
      { code: 'CAPITAL_GAINS', labelEn: 'Capital Gains', labelDe: 'Kapitalerträge' },
      { code: 'TAX_CERTIFICATE_BANK', labelEn: 'Tax Certificate (Bank)', labelDe: 'Steuerbescheinigung Bank' },
      { code: 'ANNUAL_INTEREST_CERTIFICATE', labelEn: 'Annual Interest Certificate', labelDe: 'Jahressteuerbescheinigung' },
    ],
  },
  {
    code: 'RENTAL_LEASING',
    labelEn: 'Rental & Leasing Income',
    labelDe: 'Miet- & Leasingeinkünfte',
    subCategories: [
      { code: 'RENTAL_INCOME_STATEMENT', labelEn: 'Rental Income Statement', labelDe: 'Mieteinnahmen' },
      { code: 'UTILITY_CHARGES_RECEIVED', labelEn: 'Utility Charges Received', labelDe: 'Nebenkosten' },
      { code: 'LEASE_CONTRACTS', labelEn: 'Lease Contracts', labelDe: 'Mietvertrag' },
    ],
  },
  {
    code: 'BUSINESS_FREELANCE',
    labelEn: 'Business / Freelance Income',
    labelDe: 'Geschäfts- / Freiberufliches Einkommen',
    subCategories: [
      { code: 'FREELANCE_INVOICES', labelEn: 'Freelance Invoices', labelDe: 'Honorarabrechnungen' },
      { code: 'BUSINESS_INCOME_STATEMENT', labelEn: 'Business Income Statement (EÜR)', labelDe: 'Einnahmen-Überschuss-Rechnung (EÜR)' },
      { code: 'PROFIT_LOSS_STATEMENT', labelEn: 'Profit & Loss Statement', labelDe: 'Gewinn- und Verlustrechnung' },
      { code: 'CLIENT_CONTRACTS', labelEn: 'Client Contracts', labelDe: 'Dienstleistungsverträge' },
    ],
  },
  {
    code: 'OTHER_INCOME',
    labelEn: 'Other Income',
    labelDe: 'Sonstige Einkünfte',
    subCategories: [
      { code: 'FOREIGN_INCOME', labelEn: 'Foreign Income', labelDe: 'Ausländische Einkünfte' },
      { code: 'ALIMONY_RECEIVED', labelEn: 'Alimony Received', labelDe: 'Unterhalt' },
      { code: 'ONE_TIME_PAYMENTS', labelEn: 'One-time Payments', labelDe: 'Einmalzahlungen' },
      { code: 'MISCELLANEOUS_INCOME', labelEn: 'Miscellaneous Income', labelDe: 'Sonstige Einkünfte' },
    ],
  },
  {
    code: 'WORK_EXPENSES',
    labelEn: 'Work-Related Expenses',
    labelDe: 'Werbungskosten',
    subCategories: [
      { code: 'TRAVEL_EXPENSES', labelEn: 'Travel Expenses', labelDe: 'Reisekosten' },
      { code: 'COMMUTING_COSTS', labelEn: 'Commuting Costs', labelDe: 'Fahrtkosten' },
      { code: 'HOME_OFFICE', labelEn: 'Home Office', labelDe: 'Arbeitszimmer' },
      { code: 'WORK_EQUIPMENT', labelEn: 'Work Equipment', labelDe: 'Arbeitsmittel' },
      { code: 'INTERNET_PHONE', labelEn: 'Internet & Phone', labelDe: 'Telefon & Internet' },
      { code: 'TRAINING_CERTIFICATIONS', labelEn: 'Training & Certifications', labelDe: 'Fortbildung' },
      { code: 'DOUBLE_HOUSEHOLD', labelEn: 'Double Household', labelDe: 'Doppelte Haushaltsführung' },
    ],
  },
  {
    code: 'SPECIAL_EXPENSES',
    labelEn: 'Special Expenses',
    labelDe: 'Sonderausgaben',
    subCategories: [
      { code: 'HEALTH_INSURANCE', labelEn: 'Health Insurance', labelDe: 'Krankenversicherung' },
      { code: 'LONG_TERM_CARE_INSURANCE', labelEn: 'Long-term Care Insurance', labelDe: 'Pflegeversicherung' },
      { code: 'LIFE_INSURANCE', labelEn: 'Life Insurance', labelDe: 'Lebensversicherung' },
      { code: 'PENSION_CONTRIBUTIONS', labelEn: 'Pension Contributions', labelDe: 'Altersvorsorgeaufwendungen' },
      { code: 'CHURCH_TAX', labelEn: 'Church Tax', labelDe: 'Kirchensteuer' },
      { code: 'DONATIONS', labelEn: 'Donations', labelDe: 'Spenden' },
      { code: 'TUITION_FEES', labelEn: 'Tuition Fees', labelDe: 'Studienkosten' },
    ],
  },
  {
    code: 'EXTRAORDINARY_EXPENSES',
    labelEn: 'Extraordinary Expenses',
    labelDe: 'Außergewöhnliche Belastungen',
    subCategories: [
      { code: 'MEDICAL_EXPENSES', labelEn: 'Medical Expenses', labelDe: 'Krankheitskosten' },
      { code: 'DISABILITY_PROOF', labelEn: 'Disability Proof', labelDe: 'Behindertennachweis' },
      { code: 'CARE_COSTS', labelEn: 'Care Costs', labelDe: 'Pflegekosten' },
      { code: 'ACCIDENT_COSTS', labelEn: 'Accident Costs', labelDe: 'Unfallkosten' },
      { code: 'FUNERAL_EXPENSES', labelEn: 'Funeral Expenses', labelDe: 'Beerdigungskosten' },
    ],
  },
  {
    code: 'CHILDREN_FAMILY',
    labelEn: 'Children & Family',
    labelDe: 'Kinder & Familie',
    subCategories: [
      { code: 'CHILD_BENEFIT', labelEn: 'Child Benefit', labelDe: 'Kindergeld' },
      { code: 'CHILDCARE_COSTS', labelEn: 'Childcare Costs', labelDe: 'Betreuungskosten' },
      { code: 'SCHOOL_FEES', labelEn: 'School Fees', labelDe: 'Schulgeld' },
      { code: 'EDUCATION_COSTS', labelEn: 'Education Costs', labelDe: 'Ausbildungskosten' },
      { code: 'CHILD_ALLOWANCE_PROOF', labelEn: 'Child Allowance Proof', labelDe: 'Kinderfreibetrag' },
    ],
  },
  {
    code: 'RENTAL_PROPERTY_EXPENSES',
    labelEn: 'Rental Property Expenses',
    labelDe: 'Vermietungseinkünfte',
    subCategories: [
      { code: 'LOAN_INTEREST', labelEn: 'Loan Interest', labelDe: 'Darlehenszinsen' },
      { code: 'PROPERTY_PURCHASE_CONTRACT', labelEn: 'Property Purchase Contract', labelDe: 'Kaufvertrag' },
      { code: 'REPAIRS_MAINTENANCE', labelEn: 'Repairs & Maintenance', labelDe: 'Reparaturen' },
      { code: 'PROPERTY_TAX', labelEn: 'Property Tax', labelDe: 'Grundsteuer' },
      { code: 'DEPRECIATION_DOCUMENTS', labelEn: 'Depreciation Documents (AfA)', labelDe: 'Abschreibung (AfA)' },
      { code: 'PROPERTY_INSURANCE', labelEn: 'Insurance (Property)', labelDe: 'Gebäudeversicherung' },
    ],
  },
  {
    code: 'CAPITAL_ASSETS',
    labelEn: 'Capital Assets',
    labelDe: 'Kapitalvermögen',
    subCategories: [
      { code: 'SHARE_SALE_DOCUMENTS', labelEn: 'Share Sale Documents', labelDe: 'Aktienverkauf' },
      { code: 'ETF_MUTUAL_FUND_REPORTS', labelEn: 'ETF / Mutual Fund Reports', labelDe: 'Fondsabrechnungen' },
      { code: 'CRYPTO_TRANSACTIONS', labelEn: 'Crypto Transactions', labelDe: 'Krypto-Transaktionen' },
      { code: 'FOREIGN_INVESTMENT_STATEMENTS', labelEn: 'Foreign Investment Statements', labelDe: 'Auslandsdepots' },
    ],
  },
  {
    code: 'INSURANCE',
    labelEn: 'Insurance',
    labelDe: 'Versicherungen',
    subCategories: [
      { code: 'LIABILITY_INSURANCE', labelEn: 'Liability Insurance', labelDe: 'Haftpflichtversicherung' },
      { code: 'LEGAL_INSURANCE', labelEn: 'Legal Insurance', labelDe: 'Rechtsschutzversicherung' },
      { code: 'ACCIDENT_INSURANCE', labelEn: 'Accident Insurance', labelDe: 'Unfallversicherung' },
      { code: 'DISABILITY_INSURANCE', labelEn: 'Disability Insurance', labelDe: 'Berufsunfähigkeitsversicherung' },
    ],
  },
  {
    code: 'PRIOR_YEAR_DOCUMENTS',
    labelEn: 'Prior Year Documents',
    labelDe: 'Vorjahresunterlagen',
    subCategories: [
      { code: 'PREVIOUS_TAX_RETURN', labelEn: 'Previous Tax Return', labelDe: 'Steuererklärung Vorjahr' },
      { code: 'TAX_ASSESSMENT_NOTICE', labelEn: 'Tax Assessment Notice', labelDe: 'Steuerbescheid' },
      { code: 'OBJECTION_LETTERS', labelEn: 'Objection Letters', labelDe: 'Einspruch' },
      { code: 'TAX_PAYMENT_PROOF', labelEn: 'Tax Payment Proof', labelDe: 'Steuerzahlungsnachweise' },
    ],
  },
  {
    code: 'PERSONAL_DOCUMENTS',
    labelEn: 'Identification & Personal Documents',
    labelDe: 'Persönliche Dokumente',
    subCategories: [
      { code: 'PASSPORT', labelEn: 'Passport', labelDe: 'Reisepass' },
      { code: 'ID_CARD', labelEn: 'ID Card', labelDe: 'Personalausweis' },
      { code: 'RESIDENCE_PERMIT', labelEn: 'Residence Permit', labelDe: 'Aufenthaltstitel' },
      { code: 'TAX_ID', labelEn: 'Tax ID', labelDe: 'Steuer-ID' },
      { code: 'BANK_ACCOUNT_PROOF', labelEn: 'Bank Account Proof (IBAN)', labelDe: 'IBAN-Nachweis' },
      { code: 'MARRIAGE_CERTIFICATE', labelEn: 'Marriage Certificate', labelDe: 'Heiratsurkunde' },
      { code: 'BIRTH_CERTIFICATES', labelEn: 'Birth Certificates', labelDe: 'Geburtsurkunde' },
    ],
  },
  {
    code: 'FOREIGN_CROSS_BORDER',
    labelEn: 'Foreign & Cross-Border Documents',
    labelDe: 'Ausland & Grenzüberschreitend',
    subCategories: [
      { code: 'FOREIGN_SALARY', labelEn: 'Foreign Salary', labelDe: 'Ausländisches Gehalt' },
      { code: 'DOUBLE_TAX_TREATY_PROOF', labelEn: 'Double Tax Treaty Proof', labelDe: 'Doppelbesteuerungsabkommen' },
      { code: 'FOREIGN_TAX_PAID_PROOF', labelEn: 'Foreign Tax Paid Proof', labelDe: 'Ausländische Steuerbescheinigung' },
      { code: 'RELOCATION_DOCUMENTS', labelEn: 'Relocation Documents', labelDe: 'Zuzugs-/Wegzugsnachweise' },
    ],
  },
];

// Helper function to get all main categories
export function getGermanyMainCategories(): { code: string; labelEn: string; labelDe: string }[] {
  return GERMANY_CATEGORIES.map(cat => ({
    code: cat.code,
    labelEn: cat.labelEn,
    labelDe: cat.labelDe,
  }));
}

// Helper function to get sub categories for a main category
export function getGermanySubCategories(mainCategoryCode: string): SubCategory[] {
  const category = GERMANY_CATEGORIES.find(c => c.code === mainCategoryCode);
  return category?.subCategories || [];
}

export default GERMANY_CATEGORIES;
