export enum DepositAndStakeTransactionStatusEnum {
  FAILED = 'failed',
  CANCELED = 'cancelled',
  COMPLETED = 'completed',
  PENDING = 'pending',
  PARTIAL_SUCCESS = 'partial-success',

  /**
   * If you want to check the status of expired. you need to check the expiredAt date.
   */
  EXPIRED = 'expired',
}
