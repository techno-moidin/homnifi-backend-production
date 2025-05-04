import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

import { Types } from 'mongoose';

/**
 *
 * @param model The name of the model. defaults is "all"
 * @param validationOptions Validation options
 * @returns function that handle the validation
 */
export function IsPlatformsSettings(
  model: 'withdraw' | 'deposit' | 'swap' | 'all' = 'all',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsPlatformsSettings',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) {
            return false;
          }

          for (const platform of value) {
            // Special case for SWAP since its doesn't have minDisplayAmount, but it has maxAmount
            if (model == 'swap') {
              if (
                !Types.ObjectId.isValid(platform.platform) ||
                typeof platform.minAmount !== 'number' ||
                typeof platform.maxAmount !== 'number'
              ) {
                return false;
              }

              if (platform.minAmount < 0 || platform.maxAmount < 0) {
                return false;
              }

              return true;
            }

            // for rest of models
            if (
              !Types.ObjectId.isValid(platform.platform) ||
              typeof platform.minAmount !== 'number' ||
              typeof platform.minDisplayAmount !== 'number'
            ) {
              return false;
            }

            if (platform.minAmount < 0 || platform.minDisplayAmount < 0) {
              return false;
            }
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is not a valid Platforms Settings`;
        },
      },
    });
  };
}
