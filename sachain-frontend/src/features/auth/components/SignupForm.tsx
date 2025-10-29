import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/hooks/useTranslate';

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

interface SignupFormProps {
  role: 'startup' | 'investor';
}

export default function SignupForm({ role }: SignupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = (data: z.infer<typeof signupSchema>) => {
    console.log('Signup data:', data, 'Role:', role);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Input {...register('name')} placeholder="Name" />
      {errors.name && (
        <span className="text-destructive">{errors.name.message}</span>
      )}

      <Input {...register('email')} placeholder="Email" />
      {errors.email && (
        <span className="text-destructive">{errors.email.message}</span>
      )}

      <Input {...register('password')} placeholder="Password" type="password" />
      {errors.password && (
        <span className="text-destructive">{errors.password.message}</span>
      )}

      <Button type="submit" className="w-full">
        Sign up as {role}
      </Button>
    </form>
  );
}
