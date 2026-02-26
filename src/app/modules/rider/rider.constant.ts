
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;
export type TGender = (typeof GENDER)[keyof typeof GENDER];


