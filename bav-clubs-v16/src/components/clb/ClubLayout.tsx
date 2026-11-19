import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import { NHAN_VAI_TRO, useAuth } from "@/lib/auth";
import { useCauLacBo } from "@/lib/data";
import { ClubLogo } from "@/components/common";
import { NotificationBell } from "@/components/student/NotificationBell";
import { Button } from "@/components/ui/button";

type MucMenu = { to: string; label: string; exact?: boolean };

/**
 * Menu khu Đại diện CLB – giữ nguyên các mục của thanh điều hướng code cũ (AppNav, vai trò DaiDienCLB).
 * Riêng "Thông báo" chuyển thành chuông ở góc phải giống khu Sinh viên và Quản trị.
 */
const MENU: MucMenu[] = [
  { to: "/clb", label: "Tổng quan", exact: true },
  { to: "/clb/dang-bai", label: "Đăng bài" },
  { to: "/clb/bai-dang", label: "Bài đăng của tôi" },
  { to: "/clb/thong-tin", label: "Thông tin CLB" },
  { to: "/clb/yeu-cau", label: "Yêu cầu cập nhật" },
];

/**
 * Khung giao diện riêng của khu Đại diện CLB (/clb/...): thanh trên cùng gồm logo – menu –
 * chuông thông báo – CLB đang quản lý – Đăng xuất. Không dùng chung với khu Sinh viên hay Quản trị.
 */
export function ClubLayout({ children }: { children: ReactNode }) {
  const { nguoiDung, vaiTro, signOut, maNguoiDung, maCLB } = useAuth();
  const navigate = useNavigate();
  const { data: clubs } = useCauLacBo();
  const clb = clubs?.find((c) => c.MaCLB === maCLB);

  return (
    <div className="min-h-screen bg-[#f3f5fb]">
      <header className="sticky top-0 z-40 border-b bg-white shadow-[0_6px_24px_-18px_rgb(31_35_95/0.5)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-6 lg:flex-nowrap">
          <Link to="/clb" className="flex min-w-0 shrink-0 items-center gap-2.5">
            <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-11 w-auto shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-lg font-extrabold tracking-tight text-primary">BAV CLUBS</div>
              <div className="hidden text-xs font-semibold text-muted-foreground sm:block">
                Cổng Đại diện CLB
              </div>
            </div>
          </Link>

          <nav className="scrollbar-none order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 lg:order-2 lg:w-auto lg:flex-1 lg:justify-center">
            {MENU.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                activeOptions={{ exact: !!m.exact }}
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold text-foreground/80 transition-colors hover:bg-secondary hover:text-primary"
                activeProps={{ className: "!bg-primary !text-primary-foreground" }}
              >
                {m.label}
              </Link>
            ))}
          </nav>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-3">
            {maNguoiDung && <NotificationBell tatCa="/clb/thong-bao" />}
            <Link
              to="/clb/ho-so"
              title="Hồ sơ của tôi"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition hover:bg-secondary sm:pr-3"
              activeProps={{ className: "bg-secondary" }}
            >
              {clb ? (
                <ClubLogo club={clb} size={36} />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                  {(nguoiDung?.HoTen || nguoiDung?.TenDangNhap || "C").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[170px] truncate text-sm font-bold">
                  {clb?.TenCLB || nguoiDung?.HoTen || nguoiDung?.TenDangNhap}
                </span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  {vaiTro && NHAN_VAI_TRO[vaiTro]}
                </span>
              </span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/clb/dang-nhap", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
