import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
/**
 *
 * @param enumObject The Enum Object. if the input value is ["foo", "bar"]. the decorator will check "foo" and "bar" is available on the Given enum.
 * @param validationOptions the class validation options
 * @returns Decorator object
 */
export function IsInEnum(enumObject, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      constraints: enumObject,
      name: 'IsInEnum',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const expectedValues = Object.values(args.constraints);
          const input = Array.isArray(value) ? value : value.split(',');
          return input.every((val) => expectedValues.includes(val));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} has invalid values`;
        },
      },
    });
  };
}
