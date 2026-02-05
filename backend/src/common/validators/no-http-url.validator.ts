import { registerDecorator, type ValidationOptions } from 'class-validator';

export function NoHttpUrl(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'NoHttpUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === null || value === undefined) return true;
          if (typeof value !== 'string') return false;
          return !/(https?:\/\/)/i.test(value);
        },
        defaultMessage(args) {
          return `${args?.property ?? 'value'} must not contain URLs starting with http`;
        },
      },
    });
  };
}
