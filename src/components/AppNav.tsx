import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, LogIn } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import { ROLE_LABEL, useAuth, type Role } from "@/lib/auth";
import { useNotifications } from "@/lib/data";
import { Button } from "@/components/ui/button";

type Item = { to: string; label: string; exact?: boolean; notif?: boolean };
const MENUS: Record<Role | "guest", Item[]> = {
  guest: [
    { to: "/", label: "Trang chủ", exact: true },
    { to: "/cau-lac-bo", label: "Câu lạc bộ" },
    { to: "/su-kien", label: "Sự kiện" },
  ],
  student: [
    { to: "/", label: "Trang chủ", exact: true },
    { to: "/cau-lac-bo", label: "Câu lạc bộ" },
    { to: "/su-kien", label: "Sự kiện" },
    { to: "/lich-ca-nhan", label: "Lịch cá nhân" },
    { to: "/dang-theo-doi", label: "Đang theo dõi" },
    { to: "/thong-bao", label: "Thông báo", notif: true },
  ],
  club_rep: [
    { to: "/clb", label: "Tổng quan", exact: true },
    { to: "/clb/dang-bai", label: "Đăng bài" },
    { to: "/clb/bai-dang", label: "Bài đăng của tôi" },
    { to: "/clb/thong-tin", label: "Thông tin CLB" },
    { to: "/thong-bao", label: "Thông báo", notif: true },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", exact: true },
    { to: "/admin/duyet-bai", label: "Duyệt bài" },
    { to: "/admin/clb", label: "Quản lý CLB" },
    { to: "/admin/tai-khoan", label: "Quản lý tài khoản" },
    { to: "/thong-bao", label: "Thông báo", notif: true },
  ],
};

export function AppNav() {
  const { role, profile, signOut, userId } = useAuth();
  const navigate = useNavigate();
  const { data: notifs } = useNotifications();
  const unread = notifs?.filter((n) => !n.is_read).length ?? 0;
  const items = MENUS[role ?? "guest"];

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-6 lg:flex-nowrap">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-10 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <div className="text-base font-extrabold text-primary">BA CLUBS</div>
            <div className="hidden text-xs font-semibold text-muted-foreground sm:block">Học viện Ngân hàng</div>
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
          {userId ? (
            <>
              <div className="hidden text-right leading-tight sm:block">
                <div className="max-w-[160px] truncate text-sm font-bold">{profile?.full_name || profile?.email}</div>
                <div className="text-xs font-semibold text-accent-foreground/70">{role && ROLE_LABEL[role]}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
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
            <Button asChild size="sm" className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
              <Link to="/dang-nhap">
                <LogIn className="h-4 w-4" /> Đăng nhập
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
