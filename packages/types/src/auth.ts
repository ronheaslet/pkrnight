export interface JWTPayload {
  userId: string;
  clubId: string | null;
  planTier: string;
  brandingKey: string | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  iat?: number;
  exp?: number;
}
