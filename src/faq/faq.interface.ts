import { Types } from 'mongoose';
import { SchemasNamesEnum } from '../global/enums/schemas.names.enum';

export interface FaqI extends Document {
  readonly _id: Types.ObjectId;
  readonly question: string;
  readonly answer: string;
  readonly module: SchemasNamesEnum;
  readonly addedBy: Types.ObjectId;
  readonly updatedBy: Types.ObjectId;
  readonly updatedAt: Types.ObjectId;
}
