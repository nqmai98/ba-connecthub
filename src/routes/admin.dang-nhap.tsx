import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/bav-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/dang-nhap")({
  head: () => ({
    meta: [
      { title: "Đăng nhập Quản trị – BAV CLUBS" },
      { name: "description", content: "Cổng đăng nhập dành riêng cho Quản trị viên BAV CLUBS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

/**
 * Trang đăng nhập riêng của khu Quản trị (link "/admin/dang-nhap").
 * Chỉ tài khoản quản trị (superuser) đăng nhập bằng email + mật khẩu mới vào được;
 * tài khoản Sinh viên hay Đại diện CLB sẽ bị đăng xuất ngay và báo không có quyền.
 */
function AdminLoginPage() {
  const navigate = useNavigate();
  const { ready, maNguoiDung, vaiTro, biKhoa, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [loi, setLoi] = useState("");
  const [busy, setBusy] = useState(false);
  // Chỉ tự đăng xuất khi chính form này vừa đăng nhập bằng tài khoản không phải quản trị,
  // để sinh viên lỡ mở trang này không bị đăng xuất khỏi trang Sinh viên.
  const vuaDangNhap = useRef(false);

  useEffect(() => {
    if (!ready || !maNguoiDung) return;
    if (vaiTro !== "QuanTriVien") {
      if (vuaDangNhap.current) {
        vuaDangNhap.current = false;
        setLoi("Tài khoản này không có quyền quản trị.");
        signOut();
      }
      return;
    }
    if (biKhoa) {
      setLoi("Tài khoản quản trị này đã bị khóa.");
      signOut();
      return;
    }
    navigate({ to: "/admin", replace: true });
  }, [ready, maNguoiDung, vaiTro, biKhoa]);

  const dangNhap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !matKhau) {
      setLoi("Vui lòng nhập email và mật khẩu");
      return;
    }
    setBusy(true);
    setLoi("");
    vuaDangNhap.current = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: matKhau,
    });
    setBusy(false);
    if (error) {
      vuaDangNhap.current = false;
      setLoi("Email hoặc mật khẩu không đúng");
    }
    else toast.success("Đăng nhập thành công");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5fb] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        {/* Bố cục theo PTTKHT Hình 12: logo – tên hệ thống – đối tượng – form */}
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-24 w-auto" />
          <h1 className="mt-3 text-2xl text-primary">BAV CLUBS</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground">
            <ShieldCheck className="h-4 w-4" /> Dành cho Quản trị viên
          </span>
        </div>
          {ready && maNguoiDung && vaiTro !== "QuanTriVien" && (
            <div className="mb-4 rounded-xl border border-warning bg-warning/15 p-3 text-sm font-semibold">
              Bạn đang đăng nhập bằng một tài khoản không có quyền quản trị.{" "}
              <button type="button" onClick={() => signOut()} className="font-extrabold text-primary underline">
                Đăng xuất
              </button>{" "}
              để đăng nhập bằng tài khoản quản trị.
            </div>
          )}
          <form onSubmit={dangNhap} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-bold">Email tài khoản</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  value={email}
                  maxLength={255}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLoi("");
                  }}
                  placeholder="admin@hvnh.edu.vn"
                  className="h-11 pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-khau" className="font-bold">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mat-khau"
                  type={hienMatKhau ? "text" : "password"}
                  autoComplete="current-password"
                  value={matKhau}
                  onChange={(e) => {
                    setMatKhau(e.target.value);
                    setLoi("");
                  }}
                  placeholder="••••••••"
                  className="h-11 pl-9 pr-10"
                />
                <button
                  type="button"
                  aria-label={hienMatKhau ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setHienMatKhau((v) => !v)}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  {hienMatKhau ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {loi && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {loi}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground hover:bg-primary-dark"
            >
              {busy ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs font-semibold text-muted-foreground">
            Tài khoản Quản trị viên (superuser) do nhóm phát triển cấp.
          </p>
      </div>
    </main>
  );
}
