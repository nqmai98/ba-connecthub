import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  Navigate,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/lib/auth";
import { StudentNav } from "@/components/student/StudentNav";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ClubLayout } from "@/components/clb/ClubLayout";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Không tìm thấy trang</h2>
        <p className="mt-2 text-sm text-muted-foreground">Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Trang không tải được</h1>
        <p className="mt-2 text-sm text-muted-foreground">Đã có lỗi xảy ra. Bạn hãy thử tải lại trang.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Thử lại
          </button>
          <a href="/" className="rounded-md border bg-background px-4 py-2 text-sm font-medium">Về trang chủ</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BAV CLUBS – Học viện Ngân hàng" },
      { name: "description", content: "Tra cứu câu lạc bộ, đội nhóm và sự kiện tại Học viện Ngân hàng." },
      { property: "og:title", content: "BAV CLUBS – Học viện Ngân hàng" },
      { property: "og:description", content: "Tra cứu câu lạc bộ, đội nhóm và sự kiện tại Học viện Ngân hàng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (!sessionStorage.getItem("bav_visit")) {
      sessionStorage.setItem("bav_visit", "1");
      supabase.rpc("ghi_nhan_truy_cap");
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
        {/* Thông báo nổi: góc dưới bên phải để không che thanh điều hướng, có nút × để đóng sớm */}
        <Toaster
          richColors
          closeButton
          position="bottom-right"
          duration={5000}
          offset={{ bottom: 72, right: 24 }}
          mobileOffset={{ bottom: 16, left: 12, right: 12 }}
          style={{ "--width": "420px" } as React.CSSProperties}
          toastOptions={{ closeButtonAriaLabel: "Đóng thông báo" }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Tách 3 khu giao diện theo đường dẫn, mỗi khu một khung riêng:
 *  - Sinh viên:      "/" ...            đăng nhập ở /dang-nhap      (StudentNav + nền tinh hà)
 *  - Đại diện CLB:   "/clb/..."         đăng nhập ở /clb/dang-nhap   (ClubLayout, menu riêng)
 *  - Quản trị viên:  "/admin/..."       đăng nhập ở /admin/dang-nhap (AdminLayout, thanh bên riêng)
 */
function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { vaiTro, ready, maNguoiDung } = useAuth();

  // ---- Khu Quản trị ----
  if (pathname === "/admin/dang-nhap" || pathname === "/admin/dat-lai-mat-khau") return <Outlet />;
  if (/^\/admin(\/|$)/.test(pathname)) {
    if (ready && (!maNguoiDung || vaiTro !== "QuanTriVien"))
      return <Navigate to="/admin/dang-nhap" replace />;
    return (
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    );
  }

  // ---- Khu Đại diện CLB ----
  if (pathname === "/clb/dang-nhap" || pathname.startsWith("/dang-nhap-clb")) return <Outlet />;
  if (/^\/clb(\/|$)/.test(pathname)) {
    if (ready && (!maNguoiDung || vaiTro !== "DaiDienCLB"))
      return <Navigate to="/clb/dang-nhap" replace />;
    return (
      <ClubLayout>
        <Outlet />
      </ClubLayout>
    );
  }
  // Thông báo của CLB / Quản trị nằm trong khu riêng của họ
  if (pathname.startsWith("/thong-bao") && ready && vaiTro === "DaiDienCLB")
    return <Navigate to="/clb/thong-bao" replace />;
  if (pathname.startsWith("/thong-bao") && ready && vaiTro === "QuanTriVien")
    return <Navigate to="/admin/thong-bao" replace />;

  // ---- Khu Sinh viên ----
  return (
    <div className="bg-nebula min-h-screen">
      <StudentNav />
      <Outlet />
    </div>
  );
}
