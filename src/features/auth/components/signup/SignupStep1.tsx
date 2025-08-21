// src/components/auth/signup/SignupStep1.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

const signupStep1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupStep1Data = z.infer<typeof signupStep1Schema>;

interface SignupStep1Props {
  //role: "startup" | "investor";
  onNext: (data: SignupStep1Data) => void;
}

export default function SignupStep1({ onNext }: SignupStep1Props) {
  const translate = useTranslate("getStartedModal");
  const { register, handleSubmit, formState: { errors } } = useForm<SignupStep1Data>({
    resolver: zodResolver(signupStep1Schema),
  });

  const onSubmit = (data: SignupStep1Data) => {
    //console.log("Step 1 data:", data, "Role:", role);
    onNext(data); // move to Step 2
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 mt-4">
      <Input {...register("name")} placeholder={translate("form.name")} />
      {errors.name && <span className="text-destructive">{errors.name.message}</span>}

      <Input {...register("email")} placeholder={translate("form.email")} type="email" />
      {errors.email && <span className="text-destructive">{errors.email.message}</span>}

      <Input {...register("password")} placeholder={translate("form.password")} type="password" />
      {errors.password && <span className="text-destructive">{errors.password.message}</span>}

      <Input {...register("confirmPassword")} placeholder={translate("form.confirmPassword")} type="password" />
      {errors.confirmPassword && <span className="text-destructive">{errors.confirmPassword.message}</span>}

      <Button type="submit" className="w-full">
        {translate("actions.next")}
      </Button>
    </form>
  );
}
