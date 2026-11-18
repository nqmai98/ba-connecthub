import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/bav-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { homePath, useAuth } from "@/lib/auth";
import { loginIdToEmail } from "@/lib/club-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dang-nhap-clb")({
  head: () => ({
    meta: [
      { title: "Đăng nhập CLB / Quản trị – BAV CLUBS" },
      {
        name: "description",
        content: "Cổng đăng nhập dành cho Đại diện câu lạc bộ và Quản trị viên BAV CLUBS.",
      },
      { property: "og:title", content: "Đăng nhập CLB / Quản trị – BAV CLUBS" },
      {
        property: "og:description",
        content: "Cổng đăng nhập dành cho Đại diện câu lạc bộ và Quản trị viên BAV CLUBS.",
      },
    ],
  }),
  component: ClubLoginPage,
});

function ClubLoginPage() {
  const navigate = useNavigate();
  const { ready, maNguoiDung, vaiTro, biKhoa, signOut } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Tài khoản CLB do Quản trị viên cấp nên KHÔNG kiểm tra đuôi email trường ở đây.
  useEffect(() => {
    if (!ready || !maNguoiDung) return;
    if (biKhoa) {
      toast.error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.");
      signOut();
      return;
    }
    if (vaiTro !== "DaiDienCLB" && vaiTro !== "QuanTriVien") {
      toast.error(
        "Đây không phải tài khoản CLB hoặc Quản trị viên. Sinh viên vui lòng đăng nhập ở trang Sinh viên.",
      );
      signOut();
      return;
    }
    navigate({ to: homePath(vaiTro), replace: true });
  }, [ready, maNguoiDung, vaiTro, biKhoa]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setErr("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginIdToEmail(loginId),
      password,
    });
    setBusy(false);
    if (error) toast.error("Tên đăng nhập hoặc mật khẩu không đúng");
    else toast.success("Đăng nhập thành công");
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-24 w-auto" />
          <h1 className="mt-3 text-2xl text-primary">BAV CLUBS</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground">
            <ShieldCheck className="h-4 w-4" /> Cổng dành cho CLB và Quản trị viên
          </span>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            Dùng tài khoản do Quản trị viên cấp
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="loginId" className="font-bold">
              Tên đăng nhập
            </Label>
            <Input
              id="loginId"
              type="text"
              autoCapitalize="none"
              autoComplete="username"
              value={loginId}
              maxLength={255}
              onChange={(e) => {
                setLoginId(e.target.value);
                setErr("");
              }}
              placeholder="Username của CLB (Quản trị viên: dùng email)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw" className="font-bold">
              Mật khẩu
            </Label>
            <Input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErr("");
              }}
              placeholder="••••••••"
            />
          </div>
          {err && <p className="text-sm font-semibold text-destructive">{err}</p>}
          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground hover:bg-primary-dark"
          >
            {busy ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>
        <div className="mt-6 flex flex-col items-center gap-1 border-t pt-4 text-center text-sm font-semibold text-muted-foreground">
          <span>
            Bạn là sinh viên?{" "}
            <Link
              to="/dang-nhap-sinh-vien"
              className="font-extrabold text-primary underline-offset-2 hover:underline"
            >
              Đăng nhập tại đây
            </Link>
          </span>
          <Link
            to="/dang-nhap"
            className="text-xs font-bold text-primary underline-offset-2 hover:underline"
          >
            ← Quay lại chọn đối tượng
          </Link>
        </div>
      </div>
    </main>
  );
}
