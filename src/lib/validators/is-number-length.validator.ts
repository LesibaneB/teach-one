import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Checks that a numeric value is of a specific length
 */
export function IsNumberLength(
  length: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsNumberLength',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [length],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const contraint = args.constraints[0];
          return (
            typeof value === 'number' &&
            typeof contraint === 'number' &&
            value.toString().length === contraint
          );
        },
      },
    });
  };
}
