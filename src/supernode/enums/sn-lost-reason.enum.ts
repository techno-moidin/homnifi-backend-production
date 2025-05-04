export enum LostReason {
  INACTIVE_FIRST_USER = 'inactive-first-user',
  DAILY_CAPPING = 'daily-capping',
  INSUFFICIENT_GASK = 'insufficient-gask',
  INACTIVE_USER = 'inactive-user',
  NOT_ELIGIBLE_MATCHING_BONUS = 'not-eligible-matching-bonus',
  USER_MACHINE_NOT_ELIGIBLE = 'user-machine-is-not-eligible-for-bonus',
  BLOCKED_FOR_BASE_REFERRAL = 'blocked-for-base-referral',
  BLOCKED_FOR_BUILDER_REFERRAL = 'blocked-for-builder-referral',
  BLOCKED_FOR_BUILDER_GENERATION = 'blocked-for-builder-generation',
  INSUFFICIENT_STAKE_LIMIT = 'insufficient-stake-limit',
  MEMBERSHIP_EXPIRED = 'membership-expired',
  USER_BLOCKED = 'user-blocked',
}
