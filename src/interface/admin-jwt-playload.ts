export interface AdminJWTPayload {
  id: string;
  username: string;
  fullname: string;
  email: string;
  role: string;
  passwordChangedAt: Date;
}
