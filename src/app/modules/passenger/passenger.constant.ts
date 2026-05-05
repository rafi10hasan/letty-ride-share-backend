
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  NO_PREFERENCE: 'no-preference',
} as const;
export type TGender = (typeof GENDER)[keyof typeof GENDER];


