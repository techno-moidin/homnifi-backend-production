import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

import { Types } from 'mongoose';
import { NetworkSettingsType } from '../platform/schemas/network-settings.schema';
import { ChargesType } from '../global/enums/charges.type.enum';

/**
 *
 * @param model The name of the model. defaults is "all"
 * @param validationOptions Validation options
 * @returns function that handle the validation
 */
export function IsNetworkSettings(
  model: 'withdraw' | 'deposit' | 'swap' | 'default' = 'default',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsNetworkSettings',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: NetworkSettingsType[], args: ValidationArguments) {
          if (!Array.isArray(value)) {
            return false;
          }

          const chargesTypes = Object.values(ChargesType);

          for (const network of value) {
            if (
              !Types.ObjectId.isValid(network.networkId) ||
              typeof network.commissionValue !== 'number' ||
              typeof network.feeValue !== 'number' ||
              !chargesTypes.includes(network.commissionType as any) ||
              !chargesTypes.includes(network.feeType as any)
            ) {
              return false;
            }

            if (network.feeValue <= -1 || network.commissionValue < -1) {
              return false;
            }
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is not a valid Network Settings`;
        },
      },
    });
  };
}
