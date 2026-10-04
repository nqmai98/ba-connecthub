import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/bav-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { homePath, isSchoolEmail, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dang-nhap")({
  head: () => ({
    meta: [
      { title: "Đăng nhập – BA CLUBS" },
      { name: "description", content: "Đăng nhập BA CLUBS bằng email trường @hvnh.edu.vn." },
      { property: "og:title", content: "Đăng nhập – BA CLUBS" },
      { property: "og:description", content: "Đăng nhập BA CLUBS bằng email trường @hvnh.edu.vn." },
    ],
  }),
  component: LoginPage,
});

const DOMAIN_ERR = "Chỉ chấp nhận email trường có đuôi @hvnh.edu.vn";

function LoginPage() {
  const navigate = useNavigate();
  const { ready, userId, role, profile, signOut } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !userId) return;
    if (profile?.is_locked) {
      toast.error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.");
      signOut();
      return;
    }
    navigate({ to: homePath(role), replace: true });
  }, [ready, userId, role, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSchoolEmail(email)) {
      setEmailErr(DOMAIN_ERR);
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(error.message.includes("confirm") ? "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư." : "Email hoặc mật khẩu không đúng");
        toast.success("Đăng nhập thành công");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/dang-nhap", data: { full_name: fullName.trim() } },
        });
        if (error) throw new Error(error.message.includes("hvnh") ? DOMAIN_ERR : error.message.includes("registered") ? "Email đã được đăng ký" : "Đăng ký thất bại: " + error.message);
        if (!data.session) toast.success("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-24 w-auto" />
          <h1 className="mt-3 text-2xl text-primary">BA CLUBS</h1>
          <p className="text-sm font-semibold text-muted-foreground">
            {mode === "login" ? "Đăng nhập bằng email trường" : "Tạo tài khoản bằng email trường"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-bold">Họ và tên</Label>
              <Input id="name" value={fullName} maxLength={100} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-bold">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              maxLength={255}
              aria-invalid={!!emailErr}
              className={emailErr ? "border-destructive" : ""}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailErr("");
              }}
              onBlur={() => email && !isSchoolEmail(email) && setEmailErr(DOMAIN_ERR)}
              placeholder="masv@hvnh.edu.vn"
            />
            {emailErr && <p className="text-sm font-semibold text-destructive">{emailErr}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw" className="font-bold">Mật khẩu</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={busy} className="h-11 w-full bg-accent text-base font-extrabold text-accent-foreground hover:bg-accent/90">
            {busy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm font-semibold text-muted-foreground">
          {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <button className="font-bold text-primary hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </p>
      </div>
    </main>
  );
}
