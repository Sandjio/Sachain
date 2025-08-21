import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

interface SignupFormProps {
  role: "startup" | "investor";
}

export default function SignupForm({ role }: SignupFormProps) {
  const translate = useTranslate("getStartedModal");
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = (data: any) => {
    console.log("Signup data:", data, "Role:", role);
    // call signup API here
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Input {...register("name")} placeholder={translate("form.name")} />
      {errors.name && <span className="text-destructive">{errors.name.message}</span>}

      <Input {...register("email")} placeholder={translate("form.email")} />
      {errors.email && <span className="text-destructive">{errors.email.message}</span>}

      <Input {...register("password")} placeholder={translate("form.password")} type="password" />
      {errors.password && <span className="text-destructive">{errors.password.message}</span>}

      <Button type="submit" className="w-full">
        {translate("actions.signupAs")} {role}
      </Button>
    </form>
  );
}
