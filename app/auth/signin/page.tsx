"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoaderCircleIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon, CompassIcon } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) { setError("邮箱或密码错误，请重试"); setLoading(false); return; }
      router.push("/");
      router.refresh();
    } catch { setError("登录失败，请稍后重试"); setLoading(false); }
  };

  const handleGoogleSignIn = async () => { setLoading(true); await signIn("google", { callbackUrl: "/" }); };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 size-80 rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-white/[0.01] blur-3xl" />
      </div>

      <div className="glass-dialog relative w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/[0.06]">
            <CompassIcon className="size-7 text-muted-foreground/60" />
          </div>
          <h1 className="text-xl font-bold text-foreground">欢迎回来</h1>
          <p className="mt-1 text-sm text-muted-foreground/80">登录以继续使用 Compass</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400/80 text-center">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-muted-foreground">邮箱</label>
            <div className="relative">
              <MailIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input id="email" type="email" placeholder="name@example.com" className="pl-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-muted-foreground">密码</label>
            <div className="relative">
              <LockIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="输入密码" className="pl-8 pr-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground/50" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11" disabled={loading}>
            {loading ? <><LoaderCircleIcon className="size-4 animate-spin" />登录中...</> : "登录"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1 bg-border" />
          <span className="text-xs text-muted-foreground/60">或</span>
          <Separator className="flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full border-white/[0.06] text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.04] rounded-xl h-11" onClick={handleGoogleSignIn} disabled={loading}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          使用 Google 登录
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground/60">
          还没有账户？{" "}
          <Link href="/auth/register" className="font-medium text-muted-foreground hover:text-foreground/80 transition-colors">注册</Link>
        </p>
      </div>
    </div>
  );
}
