
// import { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { useRouter } from "next/router";
// import { Eye, EyeOff, Loader2 } from "lucide-react";

// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// import { useTranslate } from "@/hooks/useTranslate";
// import { useLogin } from "@/features/auth/hook/useLogin";
// import { decodeJwt } from "@/utils/jwt";
// import SignupStep3 from "./SignupStep3";

// const loginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// interface LoginFormProps {
//   role?: "startup" | "investor";
// }

// export default function LoginForm({ role }: LoginFormProps) {
//   const router = useRouter();
//   const { register, handleSubmit, formState: { errors } } = useForm({
//     resolver: zodResolver(loginSchema),
//   });
//   const { login } = useLogin();

//   const [welcomeUser, setWelcomeUser] = useState<string | null>(null);
//   const [userData, setUserData] = useState<any>(null);
//   const [showPassword, setShowPassword] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");
//   const [isLoading, setIsLoading] = useState(false);

//   const onSubmit = async (data: any) => {
//     setErrorMsg("");
//     setIsLoading(true);
//     try {
//       const { tokens } = await login({
//         email: data.email,
//         password: data.password,
//       });

//       const decoded = decodeJwt(tokens.idToken);
//       const username = decoded?.email || decoded?.given_name || "User";

//       setWelcomeUser(username);
//       setUserData(decoded);
//     } catch (err) {
//       console.error("Login failed", err);
//       setErrorMsg("Invalid email or password. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (userData?.role) {
//       const dest =
//         userData.role === "investor"
//           ? "/dashboard/investor"
//           : "/dashboard/startup";
//       router.push(dest);
//     }
//   }, [userData, router]);

//   return (
//     <>

//      {/* <Card className="w-full max-w-md mx-auto mt-10 p-6 shadow-lg rounded-2xl bg-background">
//          <CardHeader className="space-y-1 text-center">
//           <CardTitle>Welcome Back</CardTitle>
//           <CardDescription>
//             Sign in to your {role} account
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//             {errorMsg && (
//               <Alert variant="destructive">
//                 <AlertDescription>{errorMsg}</AlertDescription>
//               </Alert>
//             )}

//             <div className="space-y-2">
//               <Label htmlFor="email">{translate("form.email")}</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="Enter your email"
//                 {...register("email")}
//               />
//               {errors.email && (
//                 <span className="text-destructive text-sm">
//                   {errors.email.message}
//                 </span>
//               )}
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password">{translate("form.password")}</Label>
//               <div className="relative">
//                 <Input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Enter your password"
//                   {...register("password")}
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="sm"
//                   className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
//                   onClick={() => setShowPassword(!showPassword)}
//                 >
//                   {showPassword ? (
//                     <EyeOff className="h-4 w-4" />
//                   ) : (
//                     <Eye className="h-4 w-4" />
//                   )}
//                 </Button>
//               </div>
//               {errors.password && (
//                 <span className="text-destructive text-sm">
//                   {errors.password.message}
//                 </span>
//               )}
//             </div>

//             <div className="flex items-center justify-between">
//               <Button variant="link" className="px-0 h-auto">
//                 Forgot password?
//               </Button>
//             </div>

//             <Button type="submit" className="w-full" disabled={isLoading}>
//               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//               {translate("actions.loginAs")} {role}
//             </Button>
//           </form>
//         </CardContent>
//       </Card> */}


// <Card className="w-full max-w-md mx-auto mt-10 p-6 shadow-lg rounded-2xl bg-background">
//         <CardHeader className="space-y-1 text-center">
//           <CardTitle>Welcome Back</CardTitle>
//           <CardDescription>Sign in to your {role} account</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//             {errorMsg && (
//               <Alert variant="destructive">
//                 <AlertDescription>{errorMsg}</AlertDescription>
//               </Alert>
//             )}

//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="Enter your email"
//                 {...register("email")}
//               />
//               {errors.email && (
//                 <span className="text-destructive text-sm">
//                   {errors.email.message}
//                 </span>
//               )}
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password">Password</Label>
//               <div className="relative">
//                 <Input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Enter your password"
//                   {...register("password")}
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="sm"
//                   className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
//                   onClick={() => setShowPassword(!showPassword)}
//                 >
//                   {showPassword ? (
//                     <EyeOff className="h-4 w-4" />
//                   ) : (
//                     <Eye className="h-4 w-4" />
//                   )}
//                 </Button>
//               </div>
//               {errors.password && (
//                 <span className="text-destructive text-sm">
//                   {errors.password.message}
//                 </span>
//               )}
//             </div>

//             <div className="flex items-center justify-between">
//               <Button variant="link" className="px-0 h-auto">
//                 Forgot password?
//               </Button>
//             </div>

//             <Button type="submit" className="w-full" disabled={isLoading}>
//               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//               {`Login as ${role ?? ""}`}
//             </Button>
//           </form>
//         </CardContent>
//       </Card>


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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Define proper types for form data and user data
type LoginFormData = z.infer<typeof loginSchema>;

interface UserData {
  email?: string;
  given_name?: string;
  role?: "startup" | "investor";
  [key: string]: unknown;
}

interface LoginFormProps {
  role?: "startup" | "investor";
}

export default function LoginForm({ role }: LoginFormProps) {
  const translate = useTranslate("getStartedModal");
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  const { login } = useLogin();

  const [welcomeUser, setWelcomeUser] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      const { tokens } = await login({
        email: data.email,
        password: data.password,
      });

      // Type guard for tokens
      if (
        typeof tokens === "object" &&
        tokens !== null &&
        "idToken" in tokens &&
        typeof (tokens as { idToken: string }).idToken === "string"
      ) {
        const decoded = decodeJwt((tokens as { idToken: string }).idToken);

        // Safely extract username with proper type checking
        let username = "User";
        if (decoded && typeof decoded === 'object') {
          if (typeof decoded.email === "string") {
            username = decoded.email;
          } else if (typeof decoded.given_name === "string") {
            username = decoded.given_name;
          } else if (typeof decoded["cognito:username"] === "string") {
            username = decoded["cognito:username"];
          }
        }

        setWelcomeUser(username);
        setUserData({
          ...decoded,
          role:
            decoded && typeof decoded.role === "string" &&
            (decoded.role === "startup" || decoded.role === "investor")
              ? decoded.role
              : undefined,
        });
      } else {
        throw new Error("Invalid tokens object returned from login");
      }
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