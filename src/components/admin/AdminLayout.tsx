import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { NHAN_VAI_TRO, useAuth } from "@/lib/auth";
import { useThongBao } from "@/lib/data";
import { Button } from "@/components/ui/button";

type MucMenu = {
  to: string;
  label: string;
  exact?: boolean;
  /** Số hiển thị cạnh mục menu (việc chờ xử lý / thông báo chưa đọc). */
  dem?: "baiChoDuyet" | "yeuCauChoDuyet" | "thongBao";
};

/**
 * Menu khu Quản trị – theo PTTKHT mục 3.2 (Hình 13–17): Dashboard, Duyệt bài, Quản lý CLB,
 * Quản lý tài khoản, Thông báo; cộng 2 trang có sẵn trong code cũ phục vụ bảng
 * yeu_cau_cap_nhat và nhat_ky_hoat_dong của chương 4 (Duyệt yêu cầu, Nhật ký).
 * Thứ tự giữ đúng như thanh điều hướng của code cũ.
 */
const MENU: MucMenu[] = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/duyet-bai", label: "Duyệt bài", dem: "baiChoDuyet" },
  { to: "/admin/yeu-cau", label: "Duyệt yêu cầu", dem: "yeuCauChoDuyet" },
  { to: "/admin/clb", label: "Quản lý CLB" },
  { to: "/admin/tai-khoan", label: "Quản lý tài khoản" },
  { to: "/admin/nhat-ky", label: "Nhật ký" },
  { to: "/admin/thong-bao", label: "Thông báo", dem: "thongBao" },
];

/** Số bài đăng / yêu cầu cập nhật đang chờ Quản trị viên xử lý, làm mới mỗi phút. */
function useViecChoXuLy() {
  return useQuery({
    queryKey: ["admin-viec-cho"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [bai, yeuCau] = await Promise.all([
        supabase
          .from("bai_dang")
          .select("MaBaiDang", { count: "exact", head: true })
          .eq("TrangThaiKiemDuyet", "ChoDuyet"),
        supabase
          .from("yeu_cau_cap_nhat")
          .select("MaYeuCau", { count: "exact", head: true })
          .eq("TrangThaiXuLy", "ChoDuyet"),
      ]);
      return { baiChoDuyet: bai.count ?? 0, yeuCauChoDuyet: yeuCau.count ?? 0 };
    },
  });
}

/**
 * Khung giao diện riêng của khu Quản trị viên (/admin/...).
 * Bố cục theo PTTKHT: thanh trên cùng gồm logo – menu – tên người dùng + vai trò – Đăng xuất.
 * Không dùng chung thanh điều hướng, nền hay menu với giao diện Sinh viên.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { nguoiDung, vaiTro, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: viecCho } = useViecChoXuLy();
  const { data: thongBao } = useThongBao();
  const so = {
    baiChoDuyet: viecCho?.baiChoDuyet ?? 0,
    yeuCauChoDuyet: viecCho?.yeuCauChoDuyet ?? 0,
    thongBao: thongBao?.filter((n) => !n.DaDoc).length ?? 0,
  };

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
              const dem = m.dem ? so[m.dem] : 0;
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
            <div className="hidden text-right leading-tight sm:block">
              <div className="max-w-[170px] truncate text-sm font-bold">
                {nguoiDung?.HoTen || nguoiDung?.EmailTruong}
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                {vaiTro && NHAN_VAI_TRO[vaiTro]}
              </div>
            </div>
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
