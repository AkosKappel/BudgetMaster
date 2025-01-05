import { z } from 'zod';

export const SignupFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  name: z.string().min(2, { message: 'Name must be at least 2 characters long.' }).trim(),
  password: z
    .string()
    .min(8, { message: 'Be at least 8 characters long' })
    .regex(/[a-z]/, { message: 'Contain at least one lowercase letter.' })
    .regex(/[A-Z]/, { message: 'Contain at least one uppercase letter.' })
    .regex(/[0-9]/, { message: 'Contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Contain at least one special character.' })
    .trim(),
});

export const LoginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password field must not be empty.' }),
});
