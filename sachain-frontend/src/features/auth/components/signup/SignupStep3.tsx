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
// });

// interface SignupStep3Props {
//   role: "startup" | "investor";
//   onNext: () => void;
//   onBack: () => void;
// }

// export default function SignupStep3({ role, onNext, onBack }: SignupStep3Props) {
//   const translate = useTranslate("getStartedModal");
//   const { uploadDocument, loading, error } = useKyc();
//   const { user, tokens } = useAuthStore(); // get idToken for authorization

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm<{ file: FileList }>({
//     resolver: zodResolver(uploadSchema),
//   });

//   const onSubmit = async (data: { file: FileList }) => {
//     if (!tokens?.idToken) {
//       alert("You must be logged in to upload KYC document");
//       return;
//     }

//     // Determine document type based on user role
//     const documentType: DocumentType =
//       user?.role === "investor" ? "passport" : "national_id";

//     try {
//       await uploadDocument({
//         idToken: tokens.idToken,
//         file: data.file[0],
//         documentType,
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




import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";
import { useKyc, DocumentType } from "@/features/auth/hook/useKyc";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

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
  const { user, tokens } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    const documentType: DocumentType =
      user?.role === "investor" ? "passport" : "national_id";

    try {
      await uploadDocument({
        idToken: tokens.idToken,
        file: data.file[0],
        documentType,
      });
      onNext();
    } catch (err) {
      console.error("KYC upload failed:", err);
    }
  };

  return (
    // <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
    //   {/* Instruction */}
    //   <p className="text-muted-foreground text-sm">
    //     {role === "investor"
    //       ? translate("upload.investorInstruction")
    //       : translate("upload.startupInstruction")}
    //   </p>

    //   {/* Upload box */}
    //   <Card className="border-dashed border-2 hover:border-primary transition-colors">
    //     <CardContent className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
    //       <Upload className="w-10 h-10 text-muted-foreground" />
    //       <div>
    //         <label
    //           htmlFor="file-upload"
    //           className="cursor-pointer text-primary font-medium hover:underline"
    //         >
    //           Click to upload
    //         </label>{" "}
    //         or drag and drop
    //       </div>
    //       <Input
    //         id="file-upload"
    //         type="file"
    //         accept="image/*,application/pdf"
    //         className="hidden"
    //         {...register("file", {
    //           onChange: (e) => setSelectedFile(e.target.files?.[0] ?? null),
    //         })}
    //       />
    //       {selectedFile && (
    //         <div className="flex items-center gap-2 text-sm text-muted-foreground">
    //           <FileText className="w-4 h-4" />
    //           <span>{selectedFile.name}</span>
    //         </div>
    //       )}
    //       {errors.file && (
    //         <span className="text-destructive text-sm">{errors.file.message}</span>
    //       )}
    //     </CardContent>
    //   </Card>

    //   {/* Actions */}
    //   <div className="flex justify-between">
    //     <Button type="button" variant="outline" onClick={onBack}>
    //       {translate("actions.back")}
    //     </Button>
    //     <Button type="submit" disabled={loading}>
    //       {loading ? "Uploading..." : translate("actions.next")}
    //     </Button>
    //   </div>

    //   {/* Error */}
    //   {error && <p className="text-destructive text-sm">{error}</p>}
    // </form>

    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
  {/* Instruction */}
  <p className="text-muted-foreground text-sm">
    {role === "investor"
      ? "Please upload a valid government-issued ID (image or PDF)."
      : "Please upload your business registration certificate or startup ID (image or PDF)."}
  </p>

  {/* Upload box */}
  <Card className="border-dashed border-2 hover:border-primary transition-colors">
    <CardContent className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
      <Upload className="w-10 h-10 text-muted-foreground" />
      <div>
        <label
          htmlFor="file-upload"
          className="cursor-pointer text-primary font-medium hover:underline"
        >
          Click to upload
        </label>{" "}
        or drag and drop
      </div>
      <Input
        id="file-upload"
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        {...register("file", {
          onChange: (e) => setSelectedFile(e.target.files?.[0] ?? null),
        })}
      />
      {selectedFile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>{selectedFile.name}</span>
        </div>
      )}
      {errors.file && (
        <span className="text-destructive text-sm">{errors.file.message}</span>
      )}
    </CardContent>
  </Card>

  {/* Actions */}
  <div className="flex justify-between">
    <Button type="button" variant="outline" onClick={onBack}>
      Back
    </Button>
    <Button type="submit" disabled={loading}>
      {loading ? "Uploading..." : "Next"}
    </Button>
  </div>

  {/* Error */}
  {error && <p className="text-destructive text-sm">{error}</p>}
</form>

  );
}
