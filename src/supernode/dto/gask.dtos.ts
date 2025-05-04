import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { IsEnum, IsNumber, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class createGaskdtos {
  @IsObjectId({ message: 'Invalid user id' })
  user: Types.ObjectId;

  @IsObjectId({ message: 'Invalid user id' })
  machine: Types.ObjectId;

  @IsNumber()
  amount: number;

  @IsEnum(TransactionFlow)
  flow: TransactionFlow;

  @IsString()
  from?: string;

  @IsString()
  reward?: Types.ObjectId;
}

export class fetchGaskdtos {
  @IsObjectId({ message: 'Invalid user id' })
  userId: Types.ObjectId;
}
