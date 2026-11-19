import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, LogIn } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import { NHAN_VAI_TRO, useAuth, type TenVaiTro } from "@/lib/auth";
import { useThongBao } from "@/lib/data";
import { Button } from "@/components/ui/button";

type Item = { to: string; label: string; exact?: boolean; notif?: boolean };

const MENUS: Record<TenVaiTro | "guest", Item[]> = {
  guest: [
    { to: "/", label: "Trang chủ", exact: true },
    { to: "/cau-lac-bo", label: "Câu lạc bộ" },
    { to: "/su-kien", label: "Sự kiện" },
  ],
  SinhVien: [
    { to: "/", label: "Trang chủ", exact: true },
    { to: "/cau-lac-bo", label: "Câu lạc bộ" },
    { to: "/su-kien", label: "Sự kiện" },
    { to: "/lich-ca-nhan", label: "Lịch cá nhân" },
    { to: "/dang-theo-doi", label: "Đang theo dõi" },
    { to: "/thong-bao", label: "Thông báo", notif: true },
  ],
  DaiDienCLB: [
    { to: "/clb", label: "Tổng quan", exact: true },
    { to: "/clb/dang-bai", label: "Đăng bài" },
    { to: "/clb/bai-dang", label: "Bài đăng của tôi" },
    { to: "/clb/thong-tin", label: "Thông tin CLB" },
    { to: "/clb/yeu-cau", label: "Yêu cầu cập nhật" },
    { to: "/thong-bao", label: "Thông báo", notif: true },
  ],
  QuanTriVien: [
    { to: "/admin", label: "Dashboard", exact: true },
    { to: "/admin/kiem-duyet", label: "Kiểm duyệt" },
    { to: "/admin/clb", label: "Quản lý CLB" },
    { to: "/admin/tai-khoan", label: "Quản lý tài khoản" },
    { to: "/admin/nhat-ky", label: "Nhật ký" },
    { to: "/thong-bao", label: "Thông báo", notif: true },
  ],
};

export function AppNav() {
  const { vaiTro, nguoiDung, signOut, maNguoiDung } = useAuth();
  const navigate = useNavigate();
  const { data: thongBao } = useThongBao();
  const unread = thongBao?.filter((n) => !n.DaDoc).length ?? 0;
  const items = MENUS[vaiTro ?? "guest"];

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-6 lg:flex-nowrap">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-10 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <div className="text-base font-extrabold text-primary">BAV CLUBS</div>
            <div className="hidden text-xs font-semibold text-muted-foreground sm:block">
              Học viện Ngân hàng
            </div>
          </div>
        </Link>

        <div className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1">
          <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 lg:justify-center">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                activeOptions={{ exact: !!it.exact }}
                className="relative shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-foreground/80 transition-colors hover:bg-secondary"
                activeProps={{ className: "!bg-primary !text-primary-foreground" }}
              >
                {it.label}
                {it.notif && unread > 0 && (
                  <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-accent-foreground">
                    {unread}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-3">
          {maNguoiDung ? (
            <>
              <div className="hidden text-right leading-tight sm:block">
                <div className="max-w-[160px] truncate text-sm font-bold">
                  {nguoiDung?.HoTen || nguoiDung?.TenDangNhap || nguoiDung?.EmailTruong}
                </div>
                <div className="text-xs font-semibold text-accent-foreground/70">
                  {vaiTro && NHAN_VAI_TRO[vaiTro]}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/dang-nhap-clb", replace: true });
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </>
          ) : (
            <Button
              asChild
              size="sm"
              className="bg-accent font-bold text-accent-foreground hover:bg-accent/90"
            >
              <Link to="/dang-nhap-clb">
                <LogIn className="h-4 w-4" /> Đăng nhập
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
