import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/bav-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/dat-lai-mat-khau")({
  head: () => ({
    meta: [
      { title: "Đặt lại mật khẩu – BAV CLUBS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DatLaiMatKhauPage,
});

/**
 * Trang mở từ liên kết "Quên mật khẩu" gửi qua email của Quản trị viên.
 * Liên kết đăng nhập tạm (phiên khôi phục) để người dùng đặt mật khẩu mới.
 */
function DatLaiMatKhauPage() {
  const navigate = useNavigate();
  const [coPhien, setCoPhien] = useState<boolean | null>(null);
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [hien, setHien] = useState(false);
  const [loi, setLoi] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let huy = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (huy) return;
      if (event === "PASSWORD_RECOVERY" || session) setCoPhien(true);
    });
    // Chờ thư viện đọc token trên liên kết rồi mới kết luận
    const t = setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!huy) setCoPhien((v) => v ?? !!s.session);
    }, 1200);
    return () => {
      huy = true;
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  const luu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mk.length < 8) {
      setLoi("Mật khẩu mới tối thiểu 8 ký tự");
      return;
    }
    if (mk !== mk2) {
      setLoi("Hai mật khẩu không khớp");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: mk });
    setBusy(false);
    if (error) {
      setLoi("Không đặt lại được mật khẩu: " + error.message);
      return;
    }
    toast.success("Đã đặt lại mật khẩu, vui lòng đăng nhập lại");
    await supabase.auth.signOut();
    navigate({ to: "/admin/dang-nhap", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5fb] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-20 w-auto" />
          <h1 className="mt-3 text-2xl text-primary">Đặt lại mật khẩu</h1>
        </div>

        {coPhien === null && (
          <p className="text-center text-sm font-semibold text-muted-foreground">Đang kiểm tra liên kết...</p>
        )}

        {coPhien === false && (
          <div className="space-y-4 text-center">
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại.
            </p>
            <Link to="/admin/dang-nhap" className="text-sm font-bold text-primary hover:underline">
              Quay lại đăng nhập
            </Link>
          </div>
        )}

        {coPhien && (
          <form onSubmit={luu} className="space-y-4" noValidate>
            {(
              [
                ["mk-moi", "Mật khẩu mới", mk, setMk],
                ["mk-lai", "Nhập lại mật khẩu mới", mk2, setMk2],
              ] as const
            ).map(([id, nhan, val, set]) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="font-bold">
                  {nhan}
                </Label>
                <div className="relative">
                  <Input
                    id={id}
                    type={hien ? "text" : "password"}
                    autoComplete="new-password"
                    value={val}
                    maxLength={72}
                    onChange={(e) => {
                      set(e.target.value);
                      setLoi("");
                    }}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    aria-label={hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setHien((v) => !v)}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                  >
                    {hien ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
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
              <KeyRound className="h-4 w-4" /> {busy ? "Đang lưu..." : "Lưu mật khẩu mới"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
