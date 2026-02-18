/**
 * Application Configuration
 * This file centralizes configurable settings like support email, from address, etc.
 * Change values here to update them across the application.
 */

export const APP_CONFIG = {
  /** Support email address - all support tickets will be sent here */
  supportEmail: 'connect@moonshakerlabs.com',

  /** Application name shown in emails */
  appName: 'WorTaF',

  /** Email sender (must match a verified domain in Resend, or use onboarding@resend.dev for testing) */
  emailFrom: 'WorTaF <onboarding@resend.dev>',

  /** Published app URL */
  appUrl: 'https://multicountry-tax-assistance.lovable.app',
} as const;

export const SUPPORT_TICKET_CATEGORIES = [
  'Document Upload Issue',
  'Sharing & Access Problem',
  'Billing & Subscription',
  'Account & Profile',
  'Tax Category Question',
  'AI Tools Issue',
  'Community / TaxOverFlow',
  'Privacy & GDPR Request',
  'Technical Bug',
  'Feature Request',
  'Other',
] as const;
