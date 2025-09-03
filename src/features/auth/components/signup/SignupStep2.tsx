// // src/components/auth/signup/SignupStep2.tsx
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { useTranslate } from "@/hooks/useTranslate";

// const signupStep2Schema = z.object({
//   code: z.string().length(6, "Code must be 6 digits"),
// });

// type SignupStep2Data = z.infer<typeof signupStep2Schema>;

// interface SignupStep2Props {
//   onVerify: (data: SignupStep2Data) => void;
//   onBack: () => void;
//   loading?: boolean;
// }

// export default function SignupStep2({ onVerify, onBack, loading }: SignupStep2Props) {
//   const translate = useTranslate("getStartedModal");
//   const { register, handleSubmit, formState: { errors } } = useForm<SignupStep2Data>({
//     resolver: zodResolver(signupStep2Schema),
//   });

//   const onSubmit = (data: SignupStep2Data) => {
//     console.log("Step 2 verification code:", data);
//     onVerify(data);
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 mt-4">
//       <Input {...register("code")} placeholder={translate("form.verifyCode")} />
//       {errors.code && <span className="text-destructive">{errors.code.message}</span>}

//       <div className="flex gap-2">
//         <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
//           {translate("actions.back")}
//         </Button>
//         <Button type="submit" className="flex-1">
//           {translate("actions.verify")}
//         </Button>
//       </div>
//     </form>
//   );
// }


// src/components/auth/signup/SignupStep2.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";

const signupStep2Schema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type SignupStep2Data = z.infer<typeof signupStep2Schema>;

interface SignupStep2Props {
  onVerify: (data: SignupStep2Data) => void;
  onBack: () => void;
  loading?: boolean;
  email?: string;
}

export default function SignupStep2({ onVerify, onBack, loading, email }: SignupStep2Props) {
  const translate = useTranslate("getStartedModal");
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SignupStep2Data>({
    resolver: zodResolver(signupStep2Schema),
  });

  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCodeSent, setIsCodeSent] = useState(false);

  const codeValue = watch("code") || "";

  useEffect(() => {
    // send code immediately on mount
    sendVerificationCode();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendVerificationCode = async () => {
    try {
      await new Promise((res) => setTimeout(res, 1000));
      setIsCodeSent(true);
      console.log("Verification code sent to:", email);
      setResendCooldown(30);
      
    } catch {
      setError("Failed to send verification code. Please try again.");
    }
  };

  const onSubmit = (data: SignupStep2Data) => {
    if (data.code.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }
    setError("");
    onVerify(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          {isCodeSent ? (
            <CheckCircle className="w-6 h-6 text-blue-600" />
          ) : (
            <Mail className="w-6 h-6 text-blue-600" />
          )}
        </div>
        <h3 className="text-lg font-semibold">{translate("steps.verifyTitle")}</h3>
        <p className="text-muted-foreground">{translate("steps.verifySubtitle")}</p>
        {email && <p className="font-medium">{email}</p>}
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {errors.code && (
        <span className="text-sm text-destructive block text-center">
          {errors.code.message}
        </span>
      )}

      {/* OTP Input */}
      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={codeValue}
          onChange={(val) => setValue("code", val, { shouldValidate: true })}
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {/* Resend Code */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {translate("steps.didntReceive")}
        </p>
        <Button
          variant="link"
          size="sm"
          type="button"
          disabled={resendCooldown > 0}
          onClick={sendVerificationCode}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : translate("actions.resendCode")}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {/* <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          {translate("actions.back")}
        </Button>
        <Button type="submit" className="flex-1" disabled={loading || codeValue.length !== 6}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {translate("actions.verify")}
        </Button> */}

        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
  Back
</Button>
<Button type="submit" className="flex-1" disabled={loading || codeValue.length !== 6}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Verify
</Button>

      </div>
    </form>
  );
}
