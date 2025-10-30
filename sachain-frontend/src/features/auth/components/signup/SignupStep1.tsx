// src/components/auth/signup/SignupStep1.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslate } from '@/hooks/useTranslate';
import { useState } from 'react';

const signupStep1Schema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupStep1Data = z.infer<typeof signupStep1Schema>;

interface SignupStep1Props {
  onNext: (data: SignupStep1Data) => void;
  loading?: boolean;
}

export default function SignupStep1({ onNext, loading }: SignupStep1Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupStep1Data>({
    resolver: zodResolver(signupStep1Schema),
  });

  const onSubmit = (data: SignupStep1Data) => {
    onNext(data); // move to Step 2
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3 mt-4"
    >
      <Input {...register('firstName')} placeholder="First Name" />
      {errors.firstName && (
        <span className="text-destructive">{errors.firstName.message}</span>
      )}

      <Input {...register('lastName')} placeholder="Last Name" />
      {errors.lastName && (
        <span className="text-destructive">{errors.lastName.message}</span>
      )}

      <Input {...register('email')} placeholder="Email" type="email" />
      {errors.email && (
        <span className="text-destructive">{errors.email.message}</span>
      )}

      <div className="relative">
        <Input
          {...register('password')}
          placeholder="Password"
          type={showPassword ? 'text' : 'password'}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
      {errors.password && (
        <span className="text-destructive">{errors.password.message}</span>
      )}

      <div className="relative">
        <Input
          {...register('confirmPassword')}
          placeholder="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
        >
          {showConfirmPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
      {errors.confirmPassword && (
        <span className="text-destructive">
          {errors.confirmPassword.message}
        </span>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        Next
      </Button>
    </form>
  );
}
