// Privacy Policy & Terms and Conditions Data
// This file is the single source of truth for all T&C and Privacy Policy content.
// Update this file whenever privacy policies change due to new features.

import { APP_NAME } from '@/lib/appConfig';

export interface PolicySection {
  type: 'heading' | 'subheading' | 'paragraph' | 'bullets';
  content: string | string[];
}

export interface PolicyData {
  title: string;
  lastUpdated: string;
  sections: PolicySection[];
}

export const privacyPolicyData: PolicyData = {
  title: 'Terms & Conditions',
  lastUpdated: '2026-02-20',
  sections: [
    {
      type: 'heading',
      content: '1. Acceptance of Terms',
    },
    {
      type: 'paragraph',
      content:
        `By creating an account or using ${APP_NAME} (\"the Platform\", \"we\", \"us\"), you agree to be bound by these Terms & Conditions. If you do not agree, you must not use the Platform. We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance.`,
    },
    {
      type: 'heading',
      content: '2. Nature of Service',
    },
    {
      type: 'paragraph',
      content:
        `${APP_NAME} is a document organisation and storage platform designed for cross-border taxpayers. The Platform does not provide tax advice, legal advice, financial planning, or accounting services of any kind. Any AI-generated outputs, summaries, or analyses are for informational and organisational purposes only and must not be relied upon as professional advice.`,
    },
    {
      type: 'bullets',
      content: [
        'Users are solely responsible for verifying the accuracy and completeness of all documents and data they upload.',
        'The Platform is not a substitute for professional tax consultation. Users should always consult qualified tax professionals for tax-related decisions.',
        'We make no guarantees regarding tax compliance, accuracy of categorisations, or suitability of the Platform for any specific tax filing purpose.',
      ],
    },
    {
      type: 'heading',
      content: '3. Document Storage',
    },
    {
      type: 'subheading',
      content: '3.1 Storage Options',
    },
    {
      type: 'paragraph',
      content:
        'The Platform offers two document storage options. You may select one during profile setup and change it from your profile settings:',
    },
    {
      type: 'bullets',
      content: [
        `Personal Google Drive – Documents are stored in your own Google Drive account. ${APP_NAME} does not retain copies of these files. We are not responsible for the availability, security, or integrity of files stored in your Google Drive.`,
        'Secure Storage Vault (available to Freemium and above plans) – Documents are stored in our cloud infrastructure. While we implement reasonable access controls aligned with industry practices, no system is entirely immune to security risks. We do not guarantee absolute protection against data loss, breaches, or unauthorised access.',
      ],
    },
    {
      type: 'subheading',
      content: '3.2 Storage Limitations',
    },
    {
      type: 'bullets',
      content: [
        'Storage limits vary by subscription plan. Exceeding limits may restrict uploads until resolved.',
        'We reserve the right to remove files that violate these terms or applicable law.',
        'We are not responsible for data loss resulting from user error, account misuse, or circumstances beyond our reasonable control.',
      ],
    },
    {
      type: 'heading',
      content: '4. File Sharing',
    },
    {
      type: 'paragraph',
      content:
        'The Platform allows you to share documents with third parties (e.g., Chartered Accountants). When using the sharing feature:',
    },
    {
      type: 'bullets',
      content: [
        'You are solely responsible for selecting the correct recipient and verifying their identity before sharing.',
        'Shared access is time-limited and protected by OTP verification. However, we cannot guarantee that recipients will not copy, screenshot, or redistribute shared content once accessed.',
        'We are not liable for any misuse of shared documents by recipients you have authorised.',
        'An audit log of sharing activity is maintained, but this is provided as a convenience and does not constitute a legally binding record.',
        'Sharing is available only for documents stored in the Secure Storage Vault, not Google Drive.',
      ],
    },
    {
      type: 'heading',
      content: '5. Privacy & Data Handling',
    },
    {
      type: 'subheading',
      content: '5.1 Data We Collect',
    },
    {
      type: 'bullets',
      content: [
        'Account information: email address, name, tax residency preferences, language preference.',
        'Documents you upload and associated metadata (file names, categories, tax years).',
        'Usage data: login activity, feature usage patterns, and community participation.',
        'Technical data: browser type, device information, and IP addresses for security and service improvement.',
      ],
    },
    {
      type: 'subheading',
      content: '5.2 How We Use Your Data',
    },
    {
      type: 'bullets',
      content: [
        'To provide and operate the Platform services you have subscribed to.',
        'To communicate service updates, security alerts, and account-related notifications.',
        'To improve Platform functionality and user experience.',
        'We do not sell, rent, or trade your personal data to third parties.',
        'We do not use your documents to train AI models.',
        'We may share data with law enforcement if required by applicable law.',
      ],
    },
    {
      type: 'subheading',
      content: '5.3 Data Retention & Deletion',
    },
    {
      type: 'bullets',
      content: [
        'You may request account deletion at any time. Account deletion is processed within 30 days.',
        'During the 30-day deletion period, you may download your files. After this period, all data is permanently removed.',
        'Documents in your Personal Google Drive remain yours and are not affected by account deletion.',
        'We may retain anonymised, aggregated data for analytical purposes after account deletion.',
        'Returning users (who previously deleted their account) are not eligible for new-user trial offers.',
      ],
    },
    {
      type: 'heading',
      content: '6. Subscriptions, Pricing & Features',
    },
    {
      type: 'paragraph',
      content:
        `All subscription plans, pricing, features, and feature availability are subject to change, addition, or removal at ${APP_NAME}'s sole discretion, at any time and without prior notice. ${APP_NAME} reserves the right to introduce new features, modify existing features, or discontinue any feature or service at its sole discretion.`,
    },
    {
      type: 'bullets',
      content: [
        'Subscription plans and pricing are subject to change. Active subscribers retain their locked pricing as long as their subscription remains uninterrupted.',
        'Free trials are offered at our sole discretion. Trial duration, features, and eligibility criteria may change without notice.',
        'Downgrades take effect at the end of the current billing cycle. Users must request downgrades at least 3 days (configurable) before billing cycle renewal.',
        'Upon downgrade from a vault-eligible plan, users have a grace period (default 30 days) to download files from the Secure Storage Vault. After this period, vault access is revoked.',
        `${APP_NAME} reserves the right to modify, suspend, or discontinue any subscription tier, feature, or service offering at any time.`,
        'Feature availability may vary by plan, region, or user account status. Features listed on the pricing page reflect current offerings and are not guaranteed to remain unchanged.',
      ],
    },
    {
      type: 'heading',
      content: '7. AI Features',
    },
    {
      type: 'paragraph',
      content:
        'Certain subscription plans include AI-powered features. By using AI features, you acknowledge:',
    },
    {
      type: 'bullets',
      content: [
        'AI analysis is performed only with your explicit consent.',
        'AI-generated outputs (summaries, insights, categorisations) are approximate and may contain errors. They do not constitute tax, legal, or financial advice.',
        'We are not liable for any decisions made based on AI-generated outputs.',
        'AI features may be modified, improved, or discontinued without prior notice.',
        'We do not use your documents to train or fine-tune AI models.',
      ],
    },
    {
      type: 'heading',
      content: '8. Community (TaxOverFlow)',
    },
    {
      type: 'paragraph',
      content:
        'By participating in TaxOverFlow, you agree to:',
    },
    {
      type: 'bullets',
      content: [
        'Post only relevant, respectful, and lawful content. Do not share personal financial details of others.',
        'Content you post may be visible to other users. We are not responsible for how others interpret or use publicly shared information.',
        'Moderators may remove content that violates guidelines without prior notice.',
        `Community responses are user-generated and do not represent advice from ${APP_NAME}. We are not liable for the accuracy of user-contributed answers.`,
      ],
    },
    {
      type: 'heading',
      content: '9. Limitation of Liability',
    },
    {
      type: 'paragraph',
      content:
        'To the maximum extent permitted by applicable law:',
    },
    {
      type: 'bullets',
      content: [
        'The Platform is provided \"as is\" and \"as available\" without warranties of any kind, express or implied.',
        'We do not warrant uninterrupted, error-free, or secure access to the Platform.',
        'We are not liable for any indirect, incidental, consequential, or punitive damages arising from use of the Platform.',
        'Our total liability for any claim arising from your use of the Platform is limited to the amount you have paid us in the 12 months preceding the claim.',
        'We are not responsible for tax-related penalties, missed deadlines, or financial losses resulting from use or reliance on the Platform.',
      ],
    },
    {
      type: 'heading',
      content: '10. Security',
    },
    {
      type: 'paragraph',
      content:
        'We implement reasonable security measures aligned with industry practices. However:',
    },
    {
      type: 'bullets',
      content: [
        'No method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.',
        'You are responsible for maintaining the confidentiality of your account credentials.',
        'You must notify us immediately of any suspected unauthorised access to your account.',
        'We are not liable for breaches resulting from user negligence, weak passwords, or compromised third-party services (e.g., Google).',
      ],
    },
    {
      type: 'heading',
      content: '11. Governing Law',
    },
    {
      type: 'paragraph',
      content:
        `These terms are governed by the laws of the jurisdiction in which ${APP_NAME} operates. Any disputes arising from or in connection with these terms shall be resolved through the competent courts of that jurisdiction.`,
    },
    {
      type: 'heading',
      content: '12. Changes to Terms',
    },
    {
      type: 'paragraph',
      content:
        `We reserve the right to update these Terms & Conditions at any time, including changes to pricing, subscription plans, feature availability, and service offerings. All such changes are at ${APP_NAME}'s sole discretion. Material changes will be communicated via email or in-app notification. Continued use of the Platform after changes constitutes acceptance. It is your responsibility to review these terms periodically.`,
    },
  ],
};

export const privacyPolicyPageData: PolicyData = {
  title: 'Privacy Policy',
  lastUpdated: '2026-02-20',
  sections: [
    {
      type: 'heading',
      content: '1. Overview',
    },
    {
      type: 'paragraph',
      content:
        `${APP_NAME} (\"the Platform\", \"we\", \"us\") is committed to handling your data responsibly and in alignment with applicable data protection regulations including GDPR. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your personal information.`,
    },
    {
      type: 'heading',
      content: '2. Data Controller',
    },
    {
      type: 'paragraph',
      content:
        `${APP_NAME} acts as the data controller for the personal data processed through the Platform. For questions regarding data processing, contact us through our support channels.`,
    },
    {
      type: 'heading',
      content: '3. Information We Collect',
    },
    {
      type: 'subheading',
      content: '3.1 Information You Provide',
    },
    {
      type: 'bullets',
      content: [
        'Account registration details: email address, name, password (or Google OAuth credentials).',
        'Profile information: tax residency, language preferences, storage preferences.',
        'Documents you upload and their metadata (file names, categories, tax years, periods).',
        'Community contributions: posts, answers, votes in TaxOverFlow.',
        'Support communications: tickets, messages, and feedback.',
      ],
    },
    {
      type: 'subheading',
      content: '3.2 Information Collected Automatically',
    },
    {
      type: 'bullets',
      content: [
        'Device and browser information, IP addresses, and access timestamps.',
        'Usage patterns: features accessed, pages visited, actions performed.',
        'Authentication events and security-related activity logs.',
      ],
    },
    {
      type: 'heading',
      content: '4. How We Use Your Information',
    },
    {
      type: 'bullets',
      content: [
        'To provide, maintain, and improve the Platform services.',
        'To authenticate your identity and secure your account.',
        'To process subscription billing and manage your plan.',
        'To send service-related communications (security alerts, billing updates, feature announcements).',
        'To enforce our Terms & Conditions and protect against misuse.',
        'To comply with legal obligations when required by applicable law.',
      ],
    },
    {
      type: 'heading',
      content: '5. What We Do NOT Do',
    },
    {
      type: 'bullets',
      content: [
        'We do not sell, rent, or trade your personal data to third parties.',
        'We do not access or read your uploaded documents without your explicit consent.',
        'We do not use your documents or personal data to train AI models.',
        'We do not share your data with advertisers or marketing companies.',
      ],
    },
    {
      type: 'heading',
      content: '6. Data Storage & Security',
    },
    {
      type: 'bullets',
      content: [
        'Data is stored in secure cloud infrastructure with access controls aligned to industry standards.',
        'We implement reasonable technical and organisational measures to protect your data.',
        'No system is entirely immune to security risks. We cannot guarantee absolute protection against all threats.',
        'You are responsible for the security of your own account credentials and authorised devices.',
      ],
    },
    {
      type: 'heading',
      content: '7. Third-Party Services',
    },
    {
      type: 'bullets',
      content: [
        'Google Drive: If you choose Google Drive storage, your documents are governed by Google\'s privacy policies. We only store a reference to your Drive folder.',
        'Google OAuth: If you sign in via Google, we receive your email and basic profile information as permitted by Google.',
        'AI Processing: Documents analysed by AI features are processed by third-party AI providers under strict data processing agreements. We do not store AI processing results beyond your session.',
      ],
    },
    {
      type: 'heading',
      content: '8. Your Rights',
    },
    {
      type: 'paragraph',
      content:
        'Subject to applicable data protection laws, you have the following rights:',
    },
    {
      type: 'bullets',
      content: [
        'Right to access: Request a copy of the personal data we hold about you.',
        'Right to rectification: Request correction of inaccurate personal data.',
        'Right to erasure: Request deletion of your account and associated data.',
        'Right to data portability: Download your documents before account deletion.',
        'Right to withdraw consent: Revoke consent for data storage at any time from your Profile settings.',
        'Right to object: Object to certain processing activities.',
      ],
    },
    {
      type: 'heading',
      content: '9. Data Retention',
    },
    {
      type: 'bullets',
      content: [
        'Active accounts: Data is retained for the duration of your account and active subscription.',
        'Deleted accounts: All personal data and documents are permanently removed within 30 days of deletion request.',
        'Archived records: Minimal records (email, deletion date) may be retained to prevent abuse of trial offers by returning users.',
        'We may retain anonymised, aggregated analytics data indefinitely.',
      ],
    },
    {
      type: 'heading',
      content: '10. Cookies & Tracking',
    },
    {
      type: 'paragraph',
      content:
        'The Platform uses essential cookies for authentication and session management. We do not use third-party advertising or tracking cookies.',
    },
    {
      type: 'heading',
      content: '11. Children\'s Privacy',
    },
    {
      type: 'paragraph',
      content:
        'The Platform is not intended for individuals under 18 years of age. We do not knowingly collect personal data from children.',
    },
    {
      type: 'heading',
      content: '12. Platform Changes & Discretion',
    },
    {
      type: 'paragraph',
      content:
        `${APP_NAME} reserves the right to modify, add, or remove features, subscription plans, pricing, and service offerings at its sole discretion, at any time and without prior notice. Feature availability may vary by plan, region, or account status.`,
    },
    {
      type: 'heading',
      content: '13. Changes to This Policy',
    },
    {
      type: 'paragraph',
      content:
        'We may update this Privacy Policy from time to time, including in response to changes in features, pricing, or service offerings. Material changes will be communicated via email or in-app notification. The \"Last updated\" date at the top reflects the most recent revision.',
    },
  ],
};
