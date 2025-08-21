import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

interface LoginFormProps {
  role: "startup" | "investor";
}

export default function LoginForm({ role }: LoginFormProps) {
  const translate = useTranslate("getStartedModal");
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: any) => {
    console.log("Login data:", data, "Role:", role);
    // call login API here
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Input {...register("email")} placeholder={translate("form.email")} />
      {errors.email && <span className="text-destructive">{errors.email.message}</span>}

      <Input {...register("password")} placeholder={translate("form.password")} type="password" />
      {errors.password && <span className="text-destructive">{errors.password.message}</span>}

      <Button type="submit" className="w-full">
        {translate("actions.loginAs")} {role}
      </Button>
    </form>
  );
}
