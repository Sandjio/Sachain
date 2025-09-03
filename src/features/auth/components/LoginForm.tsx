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
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { useTranslate } from "@/hooks/useTranslate";
// import { useLogin } from "@/features/auth/hook/useLogin";
// import type { LoginPayload } from "@/features/auth/types/authTypes";
// import { useAuthStore } from "@/store/authStore";
// import { useRouter } from "next/router";
// import { useEffect } from "react";

// const loginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// export default function LoginForm() {
//   const translate = useTranslate("getStartedModal");
//   const router = useRouter();
//   const { login, isLoading, error } = useLogin();
//   const user = useAuthStore((s) => s.user);

//   const { register, handleSubmit, formState: { errors } } =
//     useForm<LoginPayload>({ resolver: zodResolver(loginSchema) });

//   const onSubmit = async (data: LoginPayload) => {
//     await login(data); // store will be filled by hook
//   };

//   // once user exists, redirect based on role
//   useEffect(() => {
//     if (user?.role) {
//       const dest =
//         user.role === "investor" ? "/dashboard/investor" : "/dashboard/startup";
//       router.push(dest);
//     }
//   }, [user, router]);

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
//       <Input {...register("email")} placeholder={translate("form.email")} />
//       {errors.email && <span className="text-destructive">{errors.email.message}</span>}

//       <Input
//         {...register("password")}
//         placeholder={translate("form.password")}
//         type="password"
//       />
//       {errors.password && <span className="text-destructive">{errors.password.message}</span>}

//       {!!error && <span className="text-destructive text-sm">{error}</span>}

//       <Button type="submit" className="w-full" disabled={isLoading}>
//         {isLoading ? "…" : translate("actions.login")}
//       </Button>
//     </form>
//   );
// }



// import { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { useTranslate } from "@/hooks/useTranslate";
// import { useLogin } from "@/features/auth/hook/useLogin";
// import { decodeJwt } from "@/utils/jwt";
// import { useRouter } from "next/router";

// const loginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// interface LoginFormProps {
//   role?: "startup" | "investor";
// }

// export default function LoginForm({ role }: LoginFormProps) {
//   const translate = useTranslate("getStartedModal");
//   const router = useRouter();
//   const { register, handleSubmit, formState: { errors } } = useForm({
//     resolver: zodResolver(loginSchema),
//   });
//   const { login } = useLogin();

//   // Store welcome username display
//   const [welcomeUser, setWelcomeUser] = useState<string | null>(null);
//   // Store decoded user data (contains role)
//   const [userData, setUserData] = useState<any>(null);

//   const onSubmit = async (data: any) => {
//     try {
//       const { tokens } = await login({
//         email: data.email,
//         password: data.password,
//       });

//       const decoded = decodeJwt(tokens.idToken);
//       const username = decoded?.email || decoded?.given_name || "User";

//       setWelcomeUser(username); // show welcome modal
//       setUserData(decoded);     // store full user data for role checking
//     } catch (err) {
//       console.error("Login failed", err);
//     }
//   };

//   // useEffect at top level to react to userData changes
//   useEffect(() => {
//     if (userData?.role) {
//       const dest = userData.role === "investor" ? "/dashboard/investor" : "/dashboard/startup";
//       router.push(dest);
//     }
//   }, [userData, router]);

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




import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/router";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useTranslate } from "@/hooks/useTranslate";
import { useLogin } from "@/features/auth/hook/useLogin";
import { decodeJwt } from "@/utils/jwt";
import SignupStep3 from "./SignupStep3";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

interface LoginFormProps {
  role?: "startup" | "investor";
}

export default function LoginForm({ role }: LoginFormProps) {
  const translate = useTranslate("getStartedModal");
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });
  const { login } = useLogin();

  const [welcomeUser, setWelcomeUser] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      const { tokens } = await login({
        email: data.email,
        password: data.password,
      });

      const decoded = decodeJwt(tokens.idToken);
      const username = decoded?.email || decoded?.given_name || "User";

      setWelcomeUser(username);
      setUserData(decoded);
    } catch (err) {
      console.error("Login failed", err);
      setErrorMsg("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role) {
      const dest =
        userData.role === "investor"
          ? "/dashboard/investor"
          : "/dashboard/startup";
      router.push(dest);
    }
  }, [userData, router]);

  return (
    <>

     {/* <Card className="w-full max-w-md mx-auto mt-10 p-6 shadow-lg rounded-2xl bg-background">
         <CardHeader className="space-y-1 text-center">
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your {role} account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{translate("form.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
              />
              {errors.email && (
                <span className="text-destructive text-sm">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{translate("form.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <span className="text-destructive text-sm">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="link" className="px-0 h-auto">
                Forgot password?
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {translate("actions.loginAs")} {role}
            </Button>
          </form>
        </CardContent>
      </Card> */}


<Card className="w-full max-w-md mx-auto mt-10 p-6 shadow-lg rounded-2xl bg-background">
        <CardHeader className="space-y-1 text-center">
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to your {role} account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
              />
              {errors.email && (
                <span className="text-destructive text-sm">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <span className="text-destructive text-sm">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="link" className="px-0 h-auto">
                Forgot password?
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {`Login as ${role ?? ""}`}
            </Button>
          </form>
        </CardContent>
      </Card>


      <Dialog open={!!welcomeUser} onOpenChange={() => setWelcomeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>👋 Welcome back, {welcomeUser}!</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>

    </>
  );
}
