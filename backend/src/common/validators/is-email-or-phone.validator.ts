import {
  isEmail,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

export function IsEmailOrPhone(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'IsEmailOrPhone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const trimmed = value.trim();
          if (!trimmed) return false;

          if (trimmed.includes('@')) {
            return isEmail(trimmed);
          }

          // Basic international phone support: digits, spaces, (), -, optional leading +
          return /^\+?[0-9 ()-]{7,25}$/.test(trimmed);
        },
        defaultMessage(args) {
          return `${args?.property ?? 'value'} must be a valid email or phone number`;
        },
      },
    });
  };
}
