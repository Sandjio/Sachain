// // src/components/auth/signup/SignupStep3.tsx
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useTranslate } from "@/hooks/useTranslate";

// const uploadSchema = z.object({
//   file: z
//     .any()
//     .refine((files) => files?.length === 1, "You must upload a file"),
// });

// interface SignupStep3Props {
//   role: "startup" | "investor";
//   onNext: (data: { file: File }) => void;
//   onBack: () => void;
// }

// export default function SignupStep3({ role, onNext, onBack }: SignupStep3Props) {
//   const translate = useTranslate("getStartedModal");

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm<{ file: FileList }>({
//     resolver: zodResolver(uploadSchema),
//   });

//   const onSubmit = (data: { file: FileList }) => {
//     onNext({ file: data.file[0] });
//   };

//   return (
//     <form
//       onSubmit={handleSubmit(onSubmit)}
//       className="flex flex-col gap-4 mt-4"
//     >
//       <p>
//         {role === "investor"
//           ? translate("upload.investorInstruction")
//           : translate("upload.startupInstruction")}
//       </p>

//       <Input
//         type="file"
//         accept="image/*,application/pdf"
//         {...register("file")}
//       />
//       {errors.file && (
//         <span className="text-destructive">{errors.file.message}</span>
//       )}

//       <div className="flex justify-between mt-4">
//         <Button type="button" variant="outline" onClick={onBack}>
//           {translate("actions.back")}
//         </Button>
//         <Button type="submit">{translate("actions.next")}</Button>
//       </div>
//     </form>
//   );
// }

// // src/components/auth/signup/SignupStep3.tsx
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useTranslate } from "@/hooks/useTranslate";
// import { useKyc, DocumentType } from "@/features/auth/hook/useKyc";
// import { useAuthStore } from "@/store/authStore";

// const uploadSchema = z.object({
//   file: z
//     .any()
//     .refine((files) => files?.length === 1, "You must upload a file"),
//   documentType: z.enum(["national_id", "passport", "driver_license"]).optional(),
// });

// interface SignupStep3Props {
//   role: "startup" | "investor";
//   onNext: () => void;
//   onBack: () => void;
// }

// export default function SignupStep3({ role, onNext, onBack }: SignupStep3Props) {
//   const translate = useTranslate("getStartedModal");
//   const { uploadDocument, loading, error } = useKyc();
//   const { tokens } = useAuthStore(); // get idToken for authorization

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm<{ file: FileList; documentType?: DocumentType }>({
//     resolver: zodResolver(uploadSchema),
//   });

//   const onSubmit = async (data: { file: FileList; documentType?: DocumentType }) => {
//     if (!tokens?.idToken) {
//       alert("You must be logged in to upload KYC document");
//       return;
//     }

//     try {
//       await uploadDocument({
//         idToken: tokens.idToken,
//         file: data.file[0],
//         documentType: data.documentType,
//       });

//       onNext(); // go to Step 4 (success)
//     } catch (err) {
//       console.error("KYC upload failed:", err);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
//       <p>
//         {role === "investor"
//           ? translate("upload.investorInstruction")
//           : translate("upload.startupInstruction")}
//       </p>

//       <Input
//         type="file"
//         accept="image/*,application/pdf"
//         {...register("file")}
//       />
//       {errors.file && <span className="text-destructive">{errors.file.message}</span>}

//       <div className="flex justify-between mt-4">
//         <Button type="button" variant="outline" onClick={onBack}>
//           {translate("actions.back")}
//         </Button>
//         <Button type="submit" disabled={loading}>
//           {loading ? "Uploading..." : translate("actions.next")}
//         </Button>
//       </div>

//       {error && <span className="text-destructive">{error}</span>}
//     </form>
//   );
// }


// src/components/auth/signup/SignupStep3.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslate } from "@/hooks/useTranslate";
import { useKyc, DocumentType } from "@/features/auth/hook/useKyc";
import { useAuthStore } from "@/store/authStore";

const uploadSchema = z.object({
  file: z
    .any()
    .refine((files) => files?.length === 1, "You must upload a file"),
});

interface SignupStep3Props {
  role: "startup" | "investor";
  onNext: () => void;
  onBack: () => void;
}

export default function SignupStep3({ role, onNext, onBack }: SignupStep3Props) {
  const translate = useTranslate("getStartedModal");
  const { uploadDocument, loading, error } = useKyc();
  const { user, tokens } = useAuthStore(); // get idToken for authorization

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ file: FileList }>({
    resolver: zodResolver(uploadSchema),
  });

  const onSubmit = async (data: { file: FileList }) => {
    if (!tokens?.idToken) {
      alert("You must be logged in to upload KYC document");
      return;
    }

    // Determine document type based on user role
    const documentType: DocumentType =
      user?.role === "investor" ? "passport" : "national_id";

    try {
      await uploadDocument({
        idToken: tokens.idToken,
        file: data.file[0],
        documentType,
      });

      onNext(); // go to Step 4 (success)
    } catch (err) {
      console.error("KYC upload failed:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
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
      {errors.file && <span className="text-destructive">{errors.file.message}</span>}

      <div className="flex justify-between mt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          {translate("actions.back")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Uploading..." : translate("actions.next")}
        </Button>
      </div>

      {error && <span className="text-destructive">{error}</span>}
    </form>
  );
}
