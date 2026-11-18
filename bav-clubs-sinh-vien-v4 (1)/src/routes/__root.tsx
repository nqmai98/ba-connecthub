import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
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
import { AppNav } from "@/components/AppNav";
import { StudentNav } from "@/components/student/StudentNav";
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
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Tách 3 khu giao diện theo đường dẫn:
 *  - Sinh viên:      "/" (trang chủ, câu lạc bộ, sự kiện, lịch cá nhân, đang theo dõi, thông báo)
 *  - Đại diện CLB:   "/clb/..."
 *  - Quản trị viên:  "/admin/..."
 * Giao diện Sinh viên dùng thanh điều hướng + nền tinh hà riêng; hai khu quản lý
 * tạm thời vẫn dùng thanh điều hướng cũ (sẽ làm lại ở bước sau).
 */
function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { vaiTro } = useAuth();
  const laQuanLy = vaiTro === "DaiDienCLB" || vaiTro === "QuanTriVien";
  const khuQuanLy =
    /^\/(clb|admin)(\/|$)/.test(pathname) ||
    pathname.startsWith("/dang-nhap-clb") ||
    (pathname.startsWith("/thong-bao") && laQuanLy);

  if (khuQuanLy)
    return (
      <div className="min-h-screen">
        <AppNav />
        <Outlet />
      </div>
    );

  return (
    <div className="bg-nebula min-h-screen">
      <StudentNav />
      <Outlet />
    </div>
  );
}
