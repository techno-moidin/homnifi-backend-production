export const MONGODB_URI = 'MONGODB_URI';
export const JWT_SECRET_ADMIN = 'JWT_SECRET_ADMIN';
export const JWT_SECRET_IMPERSONATE_TOKEN = 'JWT_SECRET_IMPERSONATE_TOKEN';
export const IMPERSONATE = 'IMPERSONATE';
export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
export const DAY_OF_WEEK_SHORT_NAMES = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;
export const PHASE_TOKEN = 'usdk-promo';
export const PHASE_TOKEN_USD = 'usdk-promo';
export enum TIME_PERIOD {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}
