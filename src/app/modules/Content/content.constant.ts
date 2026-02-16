export const CONTENT = {
  ABOUT_US: 'about-us',
  PRIVACY_POLICY: 'privacy-policy',
  TERMS_AND_CONDITION: 'terms-and-condition',
  REFUND_POLICY: 'refund-policy'
} as const;

  export type TContent = typeof CONTENT[keyof typeof CONTENT];