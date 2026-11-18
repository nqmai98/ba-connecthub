import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogIn, LogOut } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import { NHAN_VAI_TRO, homePath, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";

type Item = { to: string; label: string; exact?: boolean };

const CONG_KHAI: Item[] = [
  { to: "/", label: "Trang chủ", exact: true },
  { to: "/cau-lac-bo", label: "Câu lạc bộ" },
  { to: "/su-kien", label: "Sự kiện" },
];

const SINH_VIEN: Item[] = [
  ...CONG_KHAI,
  { to: "/lich-ca-nhan", label: "Lịch cá nhân" },
  { to: "/dang-theo-doi", label: "Đang theo dõi" },
];

/** Thanh điều hướng riêng của giao diện Sinh viên (link gốc "/"). */
export function StudentNav() {
  const { vaiTro, nguoiDung, signOut, maNguoiDung } = useAuth();
  const navigate = useNavigate();
  const laSinhVien = vaiTro === "SinhVien";
  const laQuanLy = vaiTro === "DaiDienCLB" || vaiTro === "QuanTriVien";
  const items = laSinhVien ? SINH_VIEN : CONG_KHAI;

  return (
    <header className="glass-nav sticky top-0 z-40 border-b border-white/60 shadow-[0_6px_24px_-16px_rgb(31_35_95/0.45)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-6 lg:flex-nowrap">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-11 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <div className="text-lg font-extrabold tracking-tight text-primary">BAV CLUBS</div>
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
                className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-foreground/80 transition-colors hover:bg-secondary hover:text-primary"
                activeProps={{
                  className:
                    "!bg-primary !text-primary-foreground shadow-[0_6px_18px_-8px_rgb(41_45_120/0.8)]",
                }}
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-3">
          {maNguoiDung ? (
            <>
              {laSinhVien && <NotificationBell />}
              {laQuanLy && (
                <Button asChild size="sm" variant="outline" className="font-bold">
                  <Link to={homePath(vaiTro)}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Trang quản lý</span>
                  </Link>
                </Button>
              )}
              <div className="hidden text-right leading-tight sm:block">
                <div className="max-w-[160px] truncate text-sm font-bold">
                  {nguoiDung?.HoTen || nguoiDung?.TenDangNhap || nguoiDung?.EmailTruong}
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  {vaiTro && NHAN_VAI_TRO[vaiTro]}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-card/80"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/dang-nhap", replace: true });
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
              <Link to="/dang-nhap-sinh-vien">
                <LogIn className="h-4 w-4" /> Đăng nhập
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
