// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { useTranslate } from "@/hooks/useTranslate";

// const loginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// interface LoginFormProps {
//   role: "startup" | "investor";
// }

// export default function LoginForm({ role }: LoginFormProps) {
//   const translate = useTranslate("getStartedModal");
//   const { register, handleSubmit, formState: { errors } } = useForm({
//     resolver: zodResolver(loginSchema),
//   });

//   const onSubmit = (data: any) => {
//     console.log("Login data:", data, "Role:", role);
//     // call login API here
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
//       <Input {...register("email")} placeholder={translate("form.email")} />
//       {errors.email && <span className="text-destructive">{errors.email.message}</span>}

//       <Input {...register("password")} placeholder={translate("form.password")} type="password" />
//       {errors.password && <span className="text-destructive">{errors.password.message}</span>}

//       <Button type="submit" className="w-full">
//         {translate("actions.loginAs")} {role}
//       </Button>
//     </form>
//   );
// }


// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { useTranslate } from "@/hooks/useTranslate";
// import { useLogin } from "@/features/auth/hook/useLogin"; // 🔑 our login hook

// const loginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// interface LoginFormProps {
//   role: "startup" | "investor";
// }

// export default function LoginForm({ role }: LoginFormProps) {
//   const translate = useTranslate("getStartedModal");
//   const { login, loading, error } = useLogin();

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm({
//     resolver: zodResolver(loginSchema),
//   });

//   const onSubmit = async (data: any) => {
//     try {
//       await login({
//         email: data.email,
//         password: data.password,
//       });
//       console.log("✅ Logged in as", role);
//       // TODO: redirect based on role
//     } catch (err) {
//       console.error("❌ Login failed", err);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
//       <Input {...register("email")} placeholder={translate("form.email")} />
//       {errors.email && (
//         <span className="text-destructive">{errors.email.message}</span>
//       )}

//       <Input
//         {...register("password")}
//         placeholder={translate("form.password")}
//         type="password"
//       />
//       {errors.password && (
//         <span className="text-destructive">{errors.password.message}</span>
//       )}

//       {error && <span className="text-destructive">{error}</span>}

//       <Button type="submit" className="w-full" disabled={loading}>
//         {loading
//           ? translate("actions.loggingIn")
//           : `${translate("actions.loginAs")} ${role}`}
//       </Button>
//     </form>
//   );
// }


// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { useTranslate } from "@/hooks/useTranslate";
// import { useLogin } from "@/features/auth/hook/useLogin";
// import { useRouter } from "next/router";
// import { decodeJwt } from "@/utils/jwt";


// const loginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// export default function LoginForm() {
//   const translate = useTranslate("getStartedModal");
//   const { login, loading, error } = useLogin();
//   const router = useRouter();

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm({
//     resolver: zodResolver(loginSchema),
//   });

//   const onSubmit = async (data: any) => {
//   try {
//     const { tokens } = await login({
//       email: data.email,
//       password: data.password,
//     });

//     const decoded = decodeJwt(tokens.idToken); 
//     const role = decoded?.["custom:role"];

//     console.log("✅ Logged in, role:", role);

//     if (role === "investor") {
//       router.push("/investor/dashboard");
//     } else if (role === "startup") {
//       router.push("/startup/dashboard");
//     } else {
//       router.push("/"); // fallback
//     }
//   } catch (err) {
//     console.error("❌ Login failed", err);
//   }
// };


//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
//       <Input {...register("email")} placeholder={translate("form.email")} />
//       {errors.email && (
//         <span className="text-destructive">{errors.email.message}</span>
//       )}

//       <Input
//         {...register("password")}
//         placeholder={translate("form.password")}
//         type="password"
//       />
//       {errors.password && (
//         <span className="text-destructive">{errors.password.message}</span>
//       )}

//       {error && <span className="text-destructive">{error}</span>}

//       <Button type="submit" className="w-full" disabled={loading}>
//         {loading
//           ? translate("actions.loggingIn")
//           : translate("actions.login")}
//       </Button>
//     </form>
//   );
// }


// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { useTranslate } from "@/hooks/useTranslate";
// import { useLogin } from "@/features/auth/hook/useLogin";
// import { decodeJwt } from "@/utils/jwt";

// const loginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// interface LoginFormProps {
//   role?: "startup" | "investor";
// }

// export default function LoginForm({ role }: LoginFormProps) {
//   const translate = useTranslate("getStartedModal");
//   const { register, handleSubmit, formState: { errors } } = useForm({
//     resolver: zodResolver(loginSchema),
//   });

//   const { login } = useLogin();
//   const [welcomeUser, setWelcomeUser] = useState<string | null>(null);

//   const onSubmit = async (data: any) => {
//     try {
//       const { tokens } = await login({
//         email: data.email,
//         password: data.password,
//       });

//       const decoded = decodeJwt(tokens.idToken);
//       const username = decoded?.email || decoded?.given_name || "User";

//       setWelcomeUser(username); // show modal
//     } catch (err) {
//       console.error(" Login failed", err);
//     }
//   };

//   return (
//     <>
//       <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
//         <Input {...register("email")} placeholder={translate("form.email")} />
//         {errors.email && <span className="text-destructive">{errors.email.message}</span>}

//         <Input {...register("password")} placeholder={translate("form.password")} type="password" />
//         {errors.password && <span className="text-destructive">{errors.password.message}</span>}

//         <Button type="submit" className="w-full">
//           {translate("actions.loginAs")} {role}
//         </Button>
//       </form>

//       <Dialog open={!!welcomeUser} onOpenChange={() => setWelcomeUser(null)}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>👋 Welcome back, {welcomeUser}!</DialogTitle>
//           </DialogHeader>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }




// src/features/auth/components/LoginForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { useLogin } from "@/features/auth/hook/useLogin";
import type { LoginPayload } from "@/features/auth/types/authTypes";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/router";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function LoginForm() {
  const translate = useTranslate("getStartedModal");
  const router = useRouter();
  const { login, isLoading, error } = useLogin();
  const user = useAuthStore((s) => s.user);

  const { register, handleSubmit, formState: { errors } } =
    useForm<LoginPayload>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginPayload) => {
    await login(data); // store will be filled by hook
  };

  // once user exists, redirect based on role
  useEffect(() => {
    if (user?.role) {
      const dest =
        user.role === "investor" ? "/dashboard/investor" : "/dashboard/startup";
      router.push(dest);
    }
  }, [user, router]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Input {...register("email")} placeholder={translate("form.email")} />
      {errors.email && <span className="text-destructive">{errors.email.message}</span>}

      <Input
        {...register("password")}
        placeholder={translate("form.password")}
        type="password"
      />
      {errors.password && <span className="text-destructive">{errors.password.message}</span>}

      {!!error && <span className="text-destructive text-sm">{error}</span>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "…" : translate("actions.login")}
      </Button>
    </form>
  );
}
