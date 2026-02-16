export const ADMIN_ROLE = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const;

export type TAdminRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE];