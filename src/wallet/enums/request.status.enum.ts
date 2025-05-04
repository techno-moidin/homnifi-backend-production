export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  ON_CHAIN_FAILURE_AND_REIMBERSED = 'on-chain-failure-and-reimbursed',
  REJECTED_AND_REIMBERSED = 'rejected-and-reimbursed',
  PENDING_FOR_ADMIN = 'pending-for-admin',
}

export enum DueType {
  WITHDRAW = 'withdraw',
  NODEK = 'nodek',
  SUPERNODE = 'superNode',
}

export enum DueRemarks {
  FULL_DEBIT_WITHDRAW = 'full-debit-withdraw',
  PARTIAL_DEBIT_WITHDRAW = 'partial-debit-withdraw',
  NodeK_CLAIMED_FULL_DEBIT_WITHDRAW = 'nodeK-claimed-full-debit-withdraw',
  NodeK_CLAIMED_PARTIAL_DEBIT_WITHDRAW = 'nodeK-claimed-partial-debit-withdraw',
  SuperNode_CLAIMED_FULL_DEBIT_WITHDRAW = 'superNode-claimed-full-debit-withdraw',
  SuperNode_CLAIMED_PARTIAL_DEBIT_WITHDRAW = 'supernode-claimed-partial-debit-withdraw',
}
