export interface TokenPayload {
  iat: number;
  exp: number;
  email: string;
  isTwoFactorAuthenticated?: boolean;
  isTwoFactorEnabled: boolean;
}
