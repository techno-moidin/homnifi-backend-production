export interface PERMISSION {
  action: ACTION[];
  module: PERMISSION_MODULE;
}

export enum ACTION {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  UPDATE = 'UPDATE',
  ALL = 'ALL',
}

export enum PERMISSION_MODULE {
  DASHBOARD = 'DASHBOARD',
  SUPPORT = 'SUPPORT',
  USER = 'USER',
  ADMIN = 'ADMIN',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  TRANSFER = 'TRANSFER',
  SWAP = 'SWAP',
  MAINTENANCE = 'MAINTENANCE',
  SETTINGS = 'SETTINGS',
  NOTIFICATION = 'NOTIFICATION',
  PLATFORM = 'PLATFORM',
  CLOUDK = 'CLOUDK',
  FAQ = 'FAQ',
  SUPER_NODE = 'SUPER_NODE',
  TOKEN = 'TOKEN',
  WALLET = 'WALLET',
  NEWS = 'NEWS',
  ADMIN_LOG = 'ADMIN_LOG',
  PLATFORM_VOUCHER = 'PLATFORM_VOUCHER',
  RESET_2FA = 'RESET_2FA',
  T_BALANCE = 'T_BALANCE',
  USDK_STAKE = 'USDK_STAKE',
}

const ALL_PERMISSION = [
  ACTION.READ,
  ACTION.WRITE,
  ACTION.DELETE,
  ACTION.UPDATE,
];

const SOME_PERMISSION = [ACTION.WRITE];

export const permissionList = [
  {
    module: PERMISSION_MODULE.DASHBOARD,
    action: [ACTION.READ],
    page: '/',
  },
  {
    module: PERMISSION_MODULE.DEPOSIT,
    action: ALL_PERMISSION,
    page: 'deposit',
  },
  {
    module: PERMISSION_MODULE.WITHDRAW,
    action: ALL_PERMISSION,
    page: 'withdraw',
  },
  {
    module: PERMISSION_MODULE.TRANSFER,
    action: ALL_PERMISSION,
    page: 'transfer',
  },
  {
    module: PERMISSION_MODULE.SWAP,
    action: ALL_PERMISSION,
    page: 'swap',
  },
  {
    module: PERMISSION_MODULE.MAINTENANCE,
    action: ALL_PERMISSION,
    page: 'maintenance',
  },
  {
    module: PERMISSION_MODULE.ADMIN,
    action: ALL_PERMISSION,
    page: 'admin',
  },
  {
    module: PERMISSION_MODULE.SETTINGS,
    action: ALL_PERMISSION,
    page: 'settings',
  },
  {
    module: PERMISSION_MODULE.SUPPORT,
    action: ALL_PERMISSION,
    page: 'support',
  },
  {
    module: PERMISSION_MODULE.USER,
    action: ALL_PERMISSION,
    page: 'user',
  },
  {
    module: PERMISSION_MODULE.NOTIFICATION,
    action: ALL_PERMISSION,
    page: 'notification',
  },
  {
    module: PERMISSION_MODULE.PLATFORM,
    action: ALL_PERMISSION,
    page: 'platform',
  },
  {
    module: PERMISSION_MODULE.CLOUDK,
    action: ALL_PERMISSION,
    page: 'cloudk',
  },
  {
    module: PERMISSION_MODULE.FAQ,
    action: ALL_PERMISSION,
    page: 'FAQ',
  },
  {
    module: PERMISSION_MODULE.SUPER_NODE,
    action: ALL_PERMISSION,
    page: 'supernode',
  },
  {
    module: PERMISSION_MODULE.TOKEN,
    action: ALL_PERMISSION,
    page: 'token',
  },
  {
    module: PERMISSION_MODULE.WALLET,
    action: ALL_PERMISSION,
    page: 'wallet',
  },
  {
    module: PERMISSION_MODULE.NEWS,
    action: ALL_PERMISSION,
    page: 'news',
  },
  {
    module: PERMISSION_MODULE.ADMIN_LOG,
    action: ALL_PERMISSION,
    page: 'admin-log',
  },
  {
    module: PERMISSION_MODULE.PLATFORM_VOUCHER,
    action: ALL_PERMISSION,
    page: 'platform-voucher',
  },
  {
    module: PERMISSION_MODULE.RESET_2FA,
    action: SOME_PERMISSION,
    page: 'users-2fa',
  },
  {
    module: PERMISSION_MODULE.T_BALANCE,
    action: ALL_PERMISSION,
    page: 't-balance',
  },
  {
    module: PERMISSION_MODULE.USDK_STAKE,
    action: ALL_PERMISSION,
    page: 'usdk-stake',
  },
];
