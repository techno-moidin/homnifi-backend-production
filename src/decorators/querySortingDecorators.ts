import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidSorting(
  fields?: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      constraints: fields,
      name: 'IsValidSorting',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const keys = Object.keys(value);

          return keys.every(
            (key) =>
              args.constraints.includes(key) &&
              ['ascending', 'descending'].includes(value[key].toLowerCase()),
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must one of '${args.constraints.join(', ')}' and value should be ascending or descending.`;
        },
      },
    });
  };
}
