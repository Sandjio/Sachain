
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
import { useTranslate } from "@/hooks/useTranslate";
import { useLogin } from "@/features/auth/hook/useLogin";
import { useAuthStore } from "@/store/authStore";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const translate = useTranslate("getStartedModal");
  const router = useRouter();

  // Form handling
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Auth hook
  const { login, loading, error, isSuccess } = useLogin();
  const user = useAuthStore((state) => state.user);

  // Local UI state
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        email: data.email,
        password: data.password,
      });
    } catch (err) {
      console.error("Login failed:", err);
    }
  };


  useEffect(() => {
    if (isSuccess && user) {
      router.push("/dashboards");
    }
  }, [isSuccess, user, router]);


  //const role = user?.role ?? "";
  const role = (isSuccess && user?.role) ? user.role : "";


  return (
      <div className=" flex items-center justify-center p-2">
    <Card className="w-full max-w-md mx-auto mt-10 p-6 shadow-lg rounded-2xl bg-background">
      <CardHeader className="space-y-1 text-center">
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your{role ? ` ${role}` : ""} account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register("email")}
              disabled={loading}
              aria-invalid={!!errors.email}
              aria-describedby="email-error"
            />
            {errors.email && (
              <span id="email-error" className="text-destructive text-sm" role="alert">
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
                disabled={loading}
                aria-invalid={!!errors.password}
                aria-describedby="password-error"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <span id="password-error" className="text-destructive text-sm" role="alert">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="link" className="px-0 h-auto" disabled={loading}>
              Forgot password?
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={loading} aria-live="polite">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Signing in..." : `Login${role ? ` as ${role}` : ""}`}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
