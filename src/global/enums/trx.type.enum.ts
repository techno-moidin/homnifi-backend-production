export enum TrxType {
  SWAP = 'swap',
  SPECIAL_SWAP = 'special-swap',
  WITHDRAW = 'withdraw',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
  REIMBERS = 'reimbers',
  REWARD = 'reward',
  STAKE = 'stake',
  CLAIMED_REWARD = 'claimed-reward',
  MACHINE_PURCHASE = 'machine-purchase',
  MIGRATE = 'migrate',
  BONUS = 'bonus',
  LAUNCHPAD_AIRDROP = 'launchpad-airdrop',
  SUPERNODE_REWARD = 'supernode-reward',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  DEPOSIT_AND_STAKE = 'deposit-and-stake',
  SNGP_REWARD = 'sngp-reward',
  COUNTRY_POOL_REWARD = 'country-pool-reward',
  DEPOSIT_AND_STAKE_REQUEST = 'deposit-and-stake-request',
  HORYSMALL_WITHDRAW = 'horysmall-withdraw',
  T_BALANCE_WITHDRAW = 't-balance-withdraw',
  USDK_STAKE = 'usdk-stake',
  USDK_STAKE_REWARD = 'usdk-stake-reward',

  /**
   * Added this to resolve an Type error when trying to generate a unique ID for deposit-and-stake-request
   */
  DEPOSIT_AND_STAKE_REQUEST_ID_PREF = 'r',
  CLOUDK = 'cloudk',
  STAKE_CLAIM = 'STAKE_CLAIM',
  DUE_WALLET = 'debit-wallet',
}

export enum Deposit_Transaction_Type {
  Deposit = 'Deposit',
  Deposit_Stack = 'Deposit_Stake',
}
