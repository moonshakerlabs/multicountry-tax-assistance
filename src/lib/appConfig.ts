/**
 * Application Configuration
 * This file centralizes configurable settings like support email, from address, etc.
 * Change values here to update them across the application.
 *
 * ⚠️  TO RENAME THE APP: update APP_NAME and APP_TAGLINE below — they propagate everywhere.
 */

/** Master app name — used throughout the UI and emails */
export const APP_NAME = 'TAXBEBO';

/** App tagline */
export const APP_TAGLINE = 'Tax Beyond Borders';

export const APP_CONFIG = {
  /** Support email address - all support tickets will be sent here */
  supportEmail: 'connect@moonshakerlabs.com',

  /** Application name shown in emails */
  appName: APP_NAME,

  /** Email sender — once taxbebo.com is verified in Resend, switch to: `${APP_NAME} <noreply@taxbebo.com>` */
  emailFrom: `${APP_NAME} <onboarding@resend.dev>`,

  /** Published app URL — used as OAuth redirectTo base on custom domains */
  appUrl: 'https://taxbebo.com',
  /** www variant — add both to Supabase Auth allowed redirect URLs */
  appUrlWww: 'https://www.taxbebo.com',
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
