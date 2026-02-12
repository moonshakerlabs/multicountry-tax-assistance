// Privacy Policy & Terms and Conditions Data
// This file is the single source of truth for all T&C content.
// Update this file whenever privacy policies change due to new features.

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
  title: 'Terms & Conditions and Privacy Policy',
  lastUpdated: '2026-02-12',
  sections: [
    {
      type: 'heading',
      content: '1. Introduction',
    },
    {
      type: 'paragraph',
      content:
        'Welcome to WorTaF ("we", "us", "our"). By creating an account and using our services, you agree to these Terms & Conditions and our Privacy Policy. We are committed to protecting your privacy and ensuring your data is handled in accordance with applicable data protection laws and regulations.',
    },
    {
      type: 'heading',
      content: '2. How Your Documents Are Stored',
    },
    {
      type: 'subheading',
      content: '2.1 Storage Options',
    },
    {
      type: 'paragraph',
      content:
        'WorTaF offers two document storage options. You may choose one during profile setup and change it at any time from your profile settings:',
    },
    {
      type: 'bullets',
      content: [
        'Personal Google Drive – Documents are stored in your own Google Drive account. WorTaF does not retain copies of these files on its servers.',
        'Secure Storage Vault (SaaS) – Documents are stored in our cloud-based storage infrastructure, protected by industry-standard access controls and aligned with global data protection regulations.',
      ],
    },
    {
      type: 'subheading',
      content: '2.2 Data Access & Privacy',
    },
    {
      type: 'paragraph',
      content:
        'Regardless of your chosen storage method, we adhere to strict privacy principles:',
    },
    {
      type: 'bullets',
      content: [
        'Your documents are accessible only to you and any parties you explicitly authorise via the sharing feature.',
        'We do not access, read, or analyse your documents without your explicit consent.',
        'We do not sell, share, or distribute your personal data or documents to third parties.',
        'All data handling is aligned with GDPR, and other applicable data protection laws.',
      ],
    },
    {
      type: 'heading',
      content: '3. Data Retention & Deletion',
    },
    {
      type: 'subheading',
      content: '3.1 Your Right to Revoke Consent',
    },
    {
      type: 'paragraph',
      content:
        'You have the right to revoke your consent to data storage at any time. When you revoke consent, you may specify a retention end date. On or after the specified date:',
    },
    {
      type: 'bullets',
      content: [
        'All documents stored in the Secure Storage Vault will be permanently deleted.',
        'All associated metadata and records in our database will be removed.',
        'Documents stored in your Personal Google Drive will remain in your Drive and are your responsibility to manage.',
        'Your account and community contributions (posts, answers) will remain unless you separately request account deletion.',
      ],
    },
    {
      type: 'subheading',
      content: '3.2 Account Deletion',
    },
    {
      type: 'paragraph',
      content:
        'You may request full account deletion at any time by contacting our support team. Upon account deletion, all personal data, documents, and associated records will be permanently removed within 30 days.',
    },
    {
      type: 'heading',
      content: '4. Community Guidelines (TaxOverFlow)',
    },
    {
      type: 'paragraph',
      content:
        'Our TaxOverFlow community is a space for taxpayers to share knowledge and ask questions. By participating, you agree to:',
    },
    {
      type: 'bullets',
      content: [
        'Post only relevant, respectful, and lawful content.',
        'Not share personal financial details of others without consent.',
        'Accept that moderators may remove content that violates these guidelines.',
        'Understand that community posts are visible to other users based on country selection.',
      ],
    },
    {
      type: 'heading',
      content: '5. Sharing & Third-Party Access',
    },
    {
      type: 'paragraph',
      content:
        'When you share documents with a Chartered Accountant (CA) or other authorised recipient:',
    },
    {
      type: 'bullets',
      content: [
        'Access is time-limited and expires on the date you specify.',
        'Recipients must verify their identity via OTP before accessing shared documents.',
        'You can revoke shared access at any time from your dashboard.',
        'An audit log of all sharing activity is maintained for your records.',
      ],
    },
    {
      type: 'heading',
      content: '6. AI Features',
    },
    {
      type: 'paragraph',
      content:
        'Certain subscription plans include AI-powered features. When using AI features:',
    },
    {
      type: 'bullets',
      content: [
        'AI analysis is performed only with your explicit consent per document.',
        'AI-generated summaries and insights are for informational purposes only and do not constitute tax advice.',
        'We do not use your documents to train AI models.',
      ],
    },
    {
      type: 'heading',
      content: '7. Changes to This Policy',
    },
    {
      type: 'paragraph',
      content:
        'We may update these Terms & Conditions and Privacy Policy from time to time to reflect new features, regulatory changes, or operational updates. You will be notified of material changes via email or in-app notification. Continued use of the service after changes constitutes acceptance of the updated terms.',
    },
    {
      type: 'heading',
      content: '8. Contact',
    },
    {
      type: 'paragraph',
      content:
        'For questions about this policy, data requests, or privacy concerns, please contact us through our support channels.',
    },
  ],
};
