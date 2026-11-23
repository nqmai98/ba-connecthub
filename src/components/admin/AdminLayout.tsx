import { laEmailNoiBo } from "@/lib/club-account";
import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { NHAN_VAI_TRO, useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/student/NotificationBell";
import { Button } from "@/components/ui/button";

type MucMenu = {
  to: string;
  label: string;
  exact?: boolean;
  /** Hiện số việc đang chờ xử lý cạnh mục menu. */
  dem?: boolean;
};

/**
 * Menu khu Quản trị – theo PTTKHT mục 3.2 (Hình 13–17) và các bảng của chương 4:
 *  - Kiểm duyệt gộp "Duyệt bài" + "Duyệt yêu cầu" (bảng kiem_duyet, yeu_cau_cap_nhat)
 *  - Nhật ký: bảng nhat_ky_hoat_dong
 *  - Thông báo: chuyển thành chuông ở góc phải (giống giao diện Sinh viên)
 */
const MENU: MucMenu[] = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/kiem-duyet", label: "Kiểm duyệt", dem: true },
  { to: "/admin/clb", label: "Quản lý CLB" },
  { to: "/admin/tai-khoan", label: "Quản lý tài khoản" },
  { to: "/admin/nhat-ky", label: "Nhật ký" },
];

/** Số bài đăng / yêu cầu cập nhật đang chờ Quản trị viên xử lý, làm mới mỗi phút. */
export function useViecChoXuLy() {
  return useQuery({
    queryKey: ["admin-viec-cho"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [bai, suKien, yeuCau] = await Promise.all([
        supabase
          .from("bai_dang")
          .select("MaBaiDang", { count: "exact", head: true })
          .eq("TrangThaiKiemDuyet", "ChoDuyet")
          .neq("LoaiBaiDang", "SuKien"),
        supabase
          .from("bai_dang")
          .select("MaBaiDang", { count: "exact", head: true })
          .eq("TrangThaiKiemDuyet", "ChoDuyet")
          .eq("LoaiBaiDang", "SuKien"),
        supabase
          .from("yeu_cau_cap_nhat")
          .select("MaYeuCau", { count: "exact", head: true })
          .eq("TrangThaiXuLy", "ChoDuyet"),
      ]);
      const baiDang = bai.count ?? 0;
      const suKienCho = suKien.count ?? 0;
      const thongTin = yeuCau.count ?? 0;
      return { baiDang, suKien: suKienCho, thongTin, tong: baiDang + suKienCho + thongTin };
    },
  });
}

/**
 * Khung giao diện riêng của khu Quản trị viên (/admin/...).
 * Bố cục theo PTTKHT: thanh trên cùng gồm logo – menu – tên người dùng + vai trò – Đăng xuất.
 * Không dùng chung thanh điều hướng, nền hay menu với giao diện Sinh viên.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { nguoiDung, vaiTro, signOut, maNguoiDung } = useAuth();
  const navigate = useNavigate();
  const { data: viecCho } = useViecChoXuLy();
  const tenHienThi = nguoiDung?.HoTen || (laEmailNoiBo(nguoiDung?.EmailTruong) ? "" : nguoiDung?.EmailTruong) || "Quản trị viên";

  return (
    <div className="min-h-screen bg-[#f3f5fb]">
      <header className="sticky top-0 z-40 border-b bg-white shadow-[0_6px_24px_-18px_rgb(31_35_95/0.5)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-6 lg:flex-nowrap">
          <Link to="/admin" className="flex min-w-0 shrink-0 items-center gap-2.5">
            <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-11 w-auto shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-lg font-extrabold tracking-tight text-primary">BAV CLUBS</div>
              <div className="hidden text-xs font-semibold text-muted-foreground sm:block">
                Học viện Ngân hàng
              </div>
            </div>
          </Link>

          <nav className="scrollbar-none order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 lg:order-2 lg:w-auto lg:flex-1 lg:justify-center">
            {MENU.map((m) => {
              const dem = m.dem ? (viecCho?.tong ?? 0) : 0;
              return (
                <Link
                  key={m.to}
                  to={m.to}
                  activeOptions={{ exact: !!m.exact }}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold text-foreground/80 transition-colors hover:bg-secondary hover:text-primary"
                  activeProps={{ className: "!bg-primary !text-primary-foreground" }}
                >
                  {m.label}
                  {dem > 0 && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-accent-foreground">
                      {dem}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-3">
            {maNguoiDung && <NotificationBell tatCa="/admin/thong-bao" />}
            <Link
              to="/admin/ho-so"
              title="Hồ sơ của tôi"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition hover:bg-secondary sm:pr-3"
              activeProps={{ className: "bg-secondary" }}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                {tenHienThi.trim().split(/\s+/).slice(-1)[0]?.charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[150px] truncate text-sm font-bold">{tenHienThi}</span>
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
                navigate({ to: "/admin/dang-nhap", replace: true });
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
