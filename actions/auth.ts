'use server';

import { redirect } from 'next/navigation';

import bcrypt from 'bcrypt';

import { connectToDb } from '@/lib/mongodb';
import { createSession, deleteSession } from '@/lib/session';
import User from '@/models/User';
import { LoginFormSchema, SignupFormSchema } from '@/schemas/authSchema';

type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export async function signup(state: FormState, formData: FormData): Promise<FormState> {
  const validated = SignupFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { name, email, password } = validated.data;

  await connectToDb();
  const existingUser = await User.findOne({ email });

  if (existingUser) return { message: 'Email already exists, please use a different email or login.' };

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword });
  await user.save();

  if (!user) return { message: 'An error occurred while creating your account.' };

  const userId = user.id.toString();
  await createSession(userId);

  redirect('/dashboard');
}

export async function login(state: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const user = await User.findOne({ email: validatedFields.data.email });
  if (!user) return { message: 'Invalid login credentials.' };

  const passwordMatch = await bcrypt.compare(validatedFields.data.password, user.password);
  if (!passwordMatch) return { message: 'Invalid login credentials.' };

  const userId = user.id.toString();
  await createSession(userId);

  redirect('/dashboard');
}

export async function logout() {
  await deleteSession();

  redirect('/login');
}
