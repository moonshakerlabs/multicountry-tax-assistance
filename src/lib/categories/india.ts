// India Tax Document Categories
// Comprehensive list of tax-relevant document categories for India

export interface SubCategory {
  code: string;
  labelEn: string;
  labelHi?: string;
}

export interface MainCategory {
  code: string;
  labelEn: string;
  labelHi?: string;
  subCategories: SubCategory[];
}

export const INDIA_CATEGORIES: MainCategory[] = [
  {
    code: 'INCOME_SALARY',
    labelEn: 'Salary Income',
    labelHi: 'वेतन आय',
    subCategories: [
      { code: 'FORM_16', labelEn: 'Form 16', labelHi: 'फॉर्म 16' },
      { code: 'SALARY_SLIPS', labelEn: 'Salary Slips', labelHi: 'वेतन पर्ची' },
      { code: 'BONUS_ARREARS', labelEn: 'Bonus / Arrears', labelHi: 'बोनस / बकाया' },
      { code: 'GRATUITY', labelEn: 'Gratuity', labelHi: 'ग्रेच्युटी' },
      { code: 'LEAVE_ENCASHMENT', labelEn: 'Leave Encashment', labelHi: 'छुट्टी नकदीकरण' },
    ],
  },
  {
    code: 'INCOME_HOUSE_PROPERTY',
    labelEn: 'House Property Income',
    labelHi: 'गृह संपत्ति आय',
    subCategories: [
      { code: 'RENTAL_AGREEMENT', labelEn: 'Rental Agreement', labelHi: 'किराया समझौता' },
      { code: 'RENT_RECEIPTS', labelEn: 'Rent Receipts', labelHi: 'किराया रसीद' },
      { code: 'MUNICIPAL_TAX', labelEn: 'Municipal Tax Receipt', labelHi: 'नगरपालिका कर रसीद' },
      { code: 'HOME_LOAN_INTEREST', labelEn: 'Home Loan Interest Certificate', labelHi: 'गृह ऋण ब्याज प्रमाण पत्र' },
    ],
  },
  {
    code: 'INCOME_CAPITAL_GAINS',
    labelEn: 'Capital Gains',
    labelHi: 'पूंजीगत लाभ',
    subCategories: [
      { code: 'SHARE_TRADING_STATEMENT', labelEn: 'Share Trading Statement', labelHi: 'शेयर ट्रेडिंग स्टेटमेंट' },
      { code: 'MUTUAL_FUND_STATEMENT', labelEn: 'Mutual Fund Statement', labelHi: 'म्यूचुअल फंड स्टेटमेंट' },
      { code: 'PROPERTY_SALE_DEED', labelEn: 'Property Sale Deed', labelHi: 'संपत्ति बिक्री विलेख' },
      { code: 'CAPITAL_GAINS_STATEMENT', labelEn: 'Capital Gains Statement', labelHi: 'पूंजीगत लाभ विवरण' },
    ],
  },
  {
    code: 'INCOME_BUSINESS',
    labelEn: 'Business / Professional Income',
    labelHi: 'व्यापार / पेशेवर आय',
    subCategories: [
      { code: 'PROFIT_LOSS_ACCOUNT', labelEn: 'Profit & Loss Account', labelHi: 'लाभ और हानि खाता' },
      { code: 'BALANCE_SHEET', labelEn: 'Balance Sheet', labelHi: 'बैलेंस शीट' },
      { code: 'GST_RETURNS', labelEn: 'GST Returns', labelHi: 'जीएसटी रिटर्न' },
      { code: 'BUSINESS_BANK_STATEMENTS', labelEn: 'Business Bank Statements', labelHi: 'व्यापार बैंक स्टेटमेंट' },
    ],
  },
  {
    code: 'INCOME_OTHER_SOURCES',
    labelEn: 'Other Sources',
    labelHi: 'अन्य स्रोत',
    subCategories: [
      { code: 'INTEREST_INCOME', labelEn: 'Interest Income (Bank/FD/RD)', labelHi: 'ब्याज आय' },
      { code: 'DIVIDEND_INCOME', labelEn: 'Dividend Income', labelHi: 'लाभांश आय' },
      { code: 'LOTTERY_WINNINGS', labelEn: 'Lottery / Betting Winnings', labelHi: 'लॉटरी / सट्टा जीत' },
      { code: 'GIFT_RECEIVED', labelEn: 'Gift Received', labelHi: 'उपहार प्राप्त' },
    ],
  },
  {
    code: 'DEDUCTIONS_80C',
    labelEn: 'Deductions under 80C',
    labelHi: '80C के तहत कटौती',
    subCategories: [
      { code: 'LIC_PREMIUM', labelEn: 'LIC Premium Receipt', labelHi: 'एलआईसी प्रीमियम रसीद' },
      { code: 'PPF_STATEMENT', labelEn: 'PPF Statement', labelHi: 'पीपीएफ स्टेटमेंट' },
      { code: 'ELSS_STATEMENT', labelEn: 'ELSS Investment Proof', labelHi: 'ईएलएसएस निवेश प्रमाण' },
      { code: 'TUITION_FEES', labelEn: 'Children Tuition Fees', labelHi: 'बच्चों की ट्यूशन फीस' },
      { code: 'HOME_LOAN_PRINCIPAL', labelEn: 'Home Loan Principal', labelHi: 'गृह ऋण मूलधन' },
      { code: 'NSC_CERTIFICATE', labelEn: 'NSC Certificate', labelHi: 'एनएससी प्रमाण पत्र' },
      { code: 'SUKANYA_SAMRIDDHI', labelEn: 'Sukanya Samriddhi Statement', labelHi: 'सुकन्या समृद्धि स्टेटमेंट' },
    ],
  },
  {
    code: 'DEDUCTIONS_HEALTH',
    labelEn: 'Health Related Deductions',
    labelHi: 'स्वास्थ्य संबंधी कटौती',
    subCategories: [
      { code: 'HEALTH_INSURANCE_80D', labelEn: 'Health Insurance Premium (80D)', labelHi: 'स्वास्थ्य बीमा प्रीमियम' },
      { code: 'MEDICAL_BILLS', labelEn: 'Medical Bills', labelHi: 'मेडिकल बिल' },
      { code: 'PREVENTIVE_HEALTH_CHECKUP', labelEn: 'Preventive Health Checkup', labelHi: 'निवारक स्वास्थ्य जांच' },
    ],
  },
  {
    code: 'DEDUCTIONS_OTHER',
    labelEn: 'Other Deductions',
    labelHi: 'अन्य कटौती',
    subCategories: [
      { code: 'EDUCATION_LOAN_INTEREST_80E', labelEn: 'Education Loan Interest (80E)', labelHi: 'शिक्षा ऋण ब्याज' },
      { code: 'DONATIONS_80G', labelEn: 'Donations Receipt (80G)', labelHi: 'दान रसीद' },
      { code: 'DISABILITY_80U', labelEn: 'Disability Certificate (80U)', labelHi: 'विकलांगता प्रमाण पत्र' },
      { code: 'NPS_CONTRIBUTION_80CCD', labelEn: 'NPS Contribution (80CCD)', labelHi: 'एनपीएस योगदान' },
      { code: 'RENT_PAID_80GG', labelEn: 'Rent Paid Receipt (80GG)', labelHi: 'किराया भुगतान रसीद' },
    ],
  },
  {
    code: 'TDS_ADVANCE_TAX',
    labelEn: 'TDS & Advance Tax',
    labelHi: 'टीडीएस और अग्रिम कर',
    subCategories: [
      { code: 'FORM_26AS', labelEn: 'Form 26AS', labelHi: 'फॉर्म 26AS' },
      { code: 'TDS_CERTIFICATES', labelEn: 'TDS Certificates', labelHi: 'टीडीएस प्रमाण पत्र' },
      { code: 'ADVANCE_TAX_CHALLANS', labelEn: 'Advance Tax Challans', labelHi: 'अग्रिम कर चालान' },
      { code: 'SELF_ASSESSMENT_TAX', labelEn: 'Self Assessment Tax Challan', labelHi: 'स्व-मूल्यांकन कर चालान' },
    ],
  },
  {
    code: 'PERSONAL_DOCUMENTS',
    labelEn: 'Personal Documents',
    labelHi: 'व्यक्तिगत दस्तावेज',
    subCategories: [
      { code: 'PAN_CARD', labelEn: 'PAN Card', labelHi: 'पैन कार्ड' },
      { code: 'AADHAAR_CARD', labelEn: 'Aadhaar Card', labelHi: 'आधार कार्ड' },
      { code: 'PASSPORT', labelEn: 'Passport', labelHi: 'पासपोर्ट' },
      { code: 'BANK_STATEMENT', labelEn: 'Bank Statement', labelHi: 'बैंक स्टेटमेंट' },
      { code: 'ADDRESS_PROOF', labelEn: 'Address Proof', labelHi: 'पता प्रमाण' },
    ],
  },
  {
    code: 'PRIOR_YEAR',
    labelEn: 'Prior Year Documents',
    labelHi: 'पूर्व वर्ष के दस्तावेज',
    subCategories: [
      { code: 'PREVIOUS_ITR', labelEn: 'Previous ITR', labelHi: 'पिछला आईटीआर' },
      { code: 'ITR_ACKNOWLEDGMENT', labelEn: 'ITR Acknowledgment', labelHi: 'आईटीआर पावती' },
      { code: 'ASSESSMENT_ORDER', labelEn: 'Assessment Order', labelHi: 'मूल्यांकन आदेश' },
      { code: 'REFUND_PROOF', labelEn: 'Refund Proof', labelHi: 'रिफंड प्रमाण' },
    ],
  },
  {
    code: 'FOREIGN_INCOME',
    labelEn: 'Foreign Income & Assets',
    labelHi: 'विदेशी आय और संपत्ति',
    subCategories: [
      { code: 'FOREIGN_SALARY', labelEn: 'Foreign Salary Statement', labelHi: 'विदेशी वेतन विवरण' },
      { code: 'FOREIGN_BANK_INTEREST', labelEn: 'Foreign Bank Interest', labelHi: 'विदेशी बैंक ब्याज' },
      { code: 'FOREIGN_ASSETS_SCHEDULE', labelEn: 'Foreign Assets Schedule (FA)', labelHi: 'विदेशी संपत्ति अनुसूची' },
      { code: 'DTAA_CERTIFICATE', labelEn: 'DTAA Tax Credit Certificate', labelHi: 'डीटीएए कर क्रेडिट प्रमाण पत्र' },
    ],
  },
];

// Helper function to get all main categories
export function getIndiaMainCategories(): { code: string; labelEn: string; labelHi?: string }[] {
  return INDIA_CATEGORIES.map(cat => ({
    code: cat.code,
    labelEn: cat.labelEn,
    labelHi: cat.labelHi,
  }));
}

// Helper function to get sub categories for a main category
export function getIndiaSubCategories(mainCategoryCode: string): SubCategory[] {
  const category = INDIA_CATEGORIES.find(c => c.code === mainCategoryCode);
  return category?.subCategories || [];
}

export default INDIA_CATEGORIES;
