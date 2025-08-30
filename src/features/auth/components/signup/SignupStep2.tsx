// src/components/auth/signup/SignupStep2.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

const signupStep2Schema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type SignupStep2Data = z.infer<typeof signupStep2Schema>;

interface SignupStep2Props {
  onVerify: (data: SignupStep2Data) => void;
  onBack: () => void;
  loading?: boolean;
}

export default function SignupStep2({ onVerify, onBack, loading }: SignupStep2Props) {
  const translate = useTranslate("getStartedModal");
  const { register, handleSubmit, formState: { errors } } = useForm<SignupStep2Data>({
    resolver: zodResolver(signupStep2Schema),
  });

  const onSubmit = (data: SignupStep2Data) => {
    console.log("Step 2 verification code:", data);
    onVerify(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 mt-4">
      <Input {...register("code")} placeholder={translate("form.verifyCode")} />
      {errors.code && <span className="text-destructive">{errors.code.message}</span>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          {translate("actions.back")}
        </Button>
        <Button type="submit" className="flex-1">
          {translate("actions.verify")}
        </Button>
      </div>
    </form>
  );
}
