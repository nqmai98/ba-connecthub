import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/bav-logo.png.asset.json";
import { lovable } from "@/integrations/lovable/index";
import { DOMAIN_ERR, useStudentLoginRedirect } from "@/lib/use-student-login";
import { Button } from "@/components/ui/button";

/**
 * Trang đăng nhập Sinh viên (link "/dang-nhap"): hiện thẳng nút đăng nhập Google
 * bằng email trường, không còn bước chọn "Sinh viên / Đại diện CLB".
 * Đại diện CLB và Quản trị viên đăng nhập ở link riêng "/dang-nhap-clb".
 */
export function StudentLogin() {
  const [busy, setBusy] = useState(false);
  useStudentLoginRedirect();

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      // Quay về /dang-nhap (đã xử lý sẵn đăng nhập sinh viên)
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
          <h1 className="mt-3 text-2xl text-primary">BAV CLUBS</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-extrabold text-primary">
            <GraduationCap className="h-4 w-4" /> Đăng nhập dành cho Sinh viên
          </span>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">Dùng tài khoản email trường @hvnh.edu.vn</p>
        </div>
        <Button type="button" variant="outline" disabled={busy} onClick={google} className="h-11 w-full rounded-xl border-2 text-base font-bold">
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
          Đăng nhập bằng email trường
        </Button>
        <p className="mt-5 text-center text-xs font-semibold text-muted-foreground">
          Chỉ tài khoản Google có đuôi @hvnh.edu.vn mới đăng nhập được.
        </p>
      </div>
    </main>
  );
}
