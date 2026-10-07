import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/bav-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
  const { ready, userId, role, profile, signOut, session } = useAuth();
  const [tab, setTab] = useState<"student" | "staff">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search + "&" + window.location.hash.slice(1));
    if (params.get("error_description") || params.get("error")) {
      toast.error(DOMAIN_ERR + ". Tài khoản Google bạn chọn không được phép truy cập.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!ready || !userId) return;
    const mail = session?.user.email ?? "";
    if (!isSchoolEmail(mail) && role === "student") {
      toast.error(DOMAIN_ERR + ". Tài khoản " + (mail || "này") + " không thể đăng nhập.");
      signOut();
      return;
    }
    if (profile?.is_locked) {
      toast.error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.");
      signOut();
      return;
    }
    navigate({ to: homePath(role), replace: true });
  }, [ready, userId, role, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setEmailErr("Vui lòng nhập email và mật khẩu");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) toast.error("Email hoặc mật khẩu không đúng");
    else toast.success("Đăng nhập thành công");
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dang-nhap",
      extraParams: { hd: "hvnh.edu.vn", prompt: "select_account" },
    });
    if (result.error) {
      toast.error(DOMAIN_ERR + ". Không thể đăng nhập bằng tài khoản Google này.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-24 w-auto" />
          <h1 className="mt-3 text-2xl text-primary">BA CLUBS</h1>
          <p className="text-sm font-semibold text-muted-foreground">
            {tab === "student" ? "Sinh viên đăng nhập bằng tài khoản @hvnh.edu.vn" : "Dành cho Đại diện CLB và Quản trị viên"}
          </p>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          {(["student", "staff"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={"rounded-lg py-2 text-sm font-bold " + (tab === t ? "bg-primary text-primary-foreground" : "text-primary")}>
              {t === "student" ? "Sinh viên" : "CLB / Quản trị"}
            </button>
          ))}
        </div>
        {tab === "student" ? (
        <Button type="button" variant="outline" disabled={busy} onClick={google} className="h-11 w-full rounded-xl border-2 text-base font-bold">
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
          Đăng nhập bằng email trường
        </Button>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-bold">Email tài khoản</Label>
              <Input id="email" type="email" value={email} maxLength={255} onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }} placeholder="Email do Quản trị viên cấp" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw" className="font-bold">Mật khẩu</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {emailErr && <p className="text-sm font-semibold text-destructive">{emailErr}</p>}
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground hover:bg-primary-dark">
              {busy ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
            <p className="text-center text-xs font-semibold text-muted-foreground">Tài khoản CLB do Quản trị viên tạo và cấp.</p>
          </form>
        )}
      </div>
    </main>
  );
}
