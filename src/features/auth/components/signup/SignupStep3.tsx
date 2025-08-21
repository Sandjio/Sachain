// src/components/auth/signup/SignupStep3.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslate } from "@/hooks/useTranslate";

const uploadSchema = z.object({
  file: z
    .any()
    .refine((files) => files?.length === 1, "You must upload a file"),
});

interface SignupStep3Props {
  role: "startup" | "investor";
  onNext: (data: { file: File }) => void;
  onBack: () => void;
}

export default function SignupStep3({ role, onNext, onBack }: SignupStep3Props) {
  const translate = useTranslate("getStartedModal");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ file: FileList }>({
    resolver: zodResolver(uploadSchema),
  });

  const onSubmit = (data: { file: FileList }) => {
    onNext({ file: data.file[0] });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 mt-4"
    >
      <p>
        {role === "investor"
          ? translate("upload.investorInstruction")
          : translate("upload.startupInstruction")}
      </p>

      <Input
        type="file"
        accept="image/*,application/pdf"
        {...register("file")}
      />
      {errors.file && (
        <span className="text-destructive">{errors.file.message}</span>
      )}

      <div className="flex justify-between mt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          {translate("actions.back")}
        </Button>
        <Button type="submit">{translate("actions.next")}</Button>
      </div>
    </form>
  );
}
