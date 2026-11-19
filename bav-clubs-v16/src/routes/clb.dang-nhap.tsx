import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/bav-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { loginIdToEmail } from "@/lib/club-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/clb/dang-nhap")({
  head: () => ({
    meta: [
      { title: "Đăng nhập Đại diện CLB – BAV CLUBS" },
      {
        name: "description",
        content: "Cổng đăng nhập dành cho Đại diện câu lạc bộ BAV CLUBS.",
      },
      { property: "og:title", content: "Đăng nhập Đại diện CLB – BAV CLUBS" },
      {
        property: "og:description",
        content: "Cổng đăng nhập dành cho Đại diện câu lạc bộ BAV CLUBS.",
      },
    ],
  }),
  component: ClubLoginPage,
});

/**
 * Trang đăng nhập riêng của khu Đại diện CLB (link "/clb/dang-nhap"), kế thừa trang
 * /dang-nhap-clb của code cũ. Chỉ tài khoản Đại diện CLB (do Quản trị viên cấp) vào được.
 */
function ClubLoginPage() {
  const navigate = useNavigate();
  const { ready, maNguoiDung, vaiTro, biKhoa, signOut } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Chỉ tự đăng xuất khi chính form này vừa đăng nhập bằng tài khoản không phải CLB,
  // để sinh viên / quản trị viên lỡ mở trang này không bị đăng xuất khỏi khu của họ.
  const vuaDangNhap = useRef(false);

  // Tài khoản CLB do Quản trị viên cấp nên KHÔNG kiểm tra đuôi email trường ở đây.
  useEffect(() => {
    if (!ready || !maNguoiDung) return;
    if (vaiTro !== "DaiDienCLB") {
      if (vuaDangNhap.current) {
        vuaDangNhap.current = false;
        setErr("Đây không phải tài khoản Đại diện CLB.");
        signOut();
      }
      return;
    }
    if (biKhoa) {
      toast.error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.");
      signOut();
      return;
    }
    navigate({ to: "/clb", replace: true });
  }, [ready, maNguoiDung, vaiTro, biKhoa]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setErr("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }
    setBusy(true);
    vuaDangNhap.current = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: loginIdToEmail(loginId),
      password,
    });
    setBusy(false);
    if (error) {
      vuaDangNhap.current = false;
      toast.error("Tên đăng nhập hoặc mật khẩu không đúng");
    }
    else toast.success("Đăng nhập thành công");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5fb] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-24 w-auto" />
          <h1 className="mt-3 text-2xl text-primary">BAV CLUBS</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground">
            <ShieldCheck className="h-4 w-4" /> Cổng dành cho Đại diện CLB
          </span>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            Dùng tài khoản do Quản trị viên cấp
          </p>
        </div>
        {ready && maNguoiDung && vaiTro !== "DaiDienCLB" && (
          <div className="mb-4 rounded-xl border border-warning bg-warning/15 p-3 text-sm font-semibold">
            Bạn đang đăng nhập bằng một tài khoản không phải Đại diện CLB.{" "}
            <button type="button" onClick={() => signOut()} className="font-extrabold text-primary underline">
              Đăng xuất
            </button>{" "}
            để đăng nhập bằng tài khoản CLB.
          </div>
        )}
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
              placeholder="Username của CLB"
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
              to="/dang-nhap"
              className="font-extrabold text-primary underline-offset-2 hover:underline"
            >
              Đăng nhập tại đây
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}
