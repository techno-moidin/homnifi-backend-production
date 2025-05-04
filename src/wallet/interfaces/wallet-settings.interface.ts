import { WalletSettingsType } from '../enums/wallet-settings-type.schema';

export interface WalletSettingsI extends Document {
  readonly type: WalletSettingsType;
  readonly enabled: boolean;
  readonly buttonMessage: string;
  readonly message: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
