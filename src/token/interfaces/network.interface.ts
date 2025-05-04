import { Types } from 'mongoose';

export interface NetworkI {
  readonly _id: Types.ObjectId;
  readonly name: string;
  readonly code: string;
  readonly supportedTokens: string[];
}
