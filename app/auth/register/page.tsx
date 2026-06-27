"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LoaderCircleIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CompassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isPasswordStrong = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("两次输入的密码不一致"); return; }
    if (password.length < 8) { setError("密码长度至少为8位"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || data.error || "注册失败，请稍后重试"); setLoading(false); return; }
      setSuccess(true);
      setTimeout(() => router.push("/auth/signin"), 1500);
    } catch { setError("注册失败，请检查网络连接"); setLoading(false); }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 size-80 rounded-full bg-white/[0.02] blur-3xl" />
          <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-white/[0.01] blur-3xl" />
        </div>
        <div className="glass-dialog relative w-full max-w-sm p-8 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircleIcon className="size-7 text-emerald-400/70" />
          </div>
          <h1 className="text-xl font-bold text-foreground">注册成功！</h1>
          <p className="mt-1 text-sm text-muted-foreground/80">正在跳转到登录页面...</p>
          <Link href="/auth/signin" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground/80 transition-colors">立即登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 size-80 rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-white/[0.01] blur-3xl" />
      </div>

      <div className="glass-dialog relative w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/[0.06]">
            <CompassIcon className="size-7 text-muted-foreground/60" />
          </div>
          <h1 className="text-xl font-bold text-foreground">创建账户</h1>
          <p className="mt-1 text-sm text-muted-foreground/80">注册以开始使用 Compass</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400/80">
            <XCircleIcon className="size-4 shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-muted-foreground">名称</label>
            <div className="relative">
              <UserIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input id="name" type="text" placeholder="您的名称" className="pl-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-muted-foreground">邮箱</label>
            <div className="relative">
              <MailIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input id="email" type="email" placeholder="name@example.com" className="pl-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-muted-foreground">密码</label>
            <div className="relative">
              <LockIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="至少8位密码" className="pl-8 pr-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground/50" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                {[
                  { ok: isPasswordStrong, label: "至少8位字符" },
                  { ok: hasUpperCase, label: "包含大写字母" },
                  { ok: hasNumber, label: "包含数字" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    {item.ok ? <CheckCircleIcon className="size-3 text-emerald-400/60" /> : <XCircleIcon className="size-3 text-muted-foreground/40" />}
                    <span className={item.ok ? "text-emerald-400/60" : "text-muted-foreground/60"}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">确认密码</label>
            <div className="relative">
              <LockIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input id="confirmPassword" type="password" placeholder="再次输入密码" className={`pl-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl ${confirmPassword.length > 0 && !passwordsMatch ? "border-red-500/40" : ""}`} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && <p className="mt-1 text-xs text-red-400/60">密码不一致</p>}
            {confirmPassword.length > 0 && passwordsMatch && (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400/60">
                <CheckCircleIcon className="size-3" />密码匹配
              </p>
            )}
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11" disabled={loading || !passwordsMatch || password.length < 8}>
            {loading ? <><LoaderCircleIcon className="size-4 animate-spin" />注册中...</> : "注册"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground/60">
          已有账户？{" "}
          <Link href="/auth/signin" className="font-medium text-muted-foreground hover:text-foreground/80 transition-colors">登录</Link>
        </p>
      </div>
    </div>
  );
}
