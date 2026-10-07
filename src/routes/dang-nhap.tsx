import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/bav-logo.png.asset.json";
import { useStudentLoginRedirect } from "@/lib/use-student-login";

export const Route = createFileRoute("/dang-nhap")({
  head: () => ({
    meta: [
      { title: "Đăng nhập – BA CLUBS" },
      { name: "description", content: "Chọn đối tượng đăng nhập BA CLUBS: Sinh viên hoặc Đại diện CLB / Quản trị viên." },
      { property: "og:title", content: "Đăng nhập – BA CLUBS" },
      { property: "og:description", content: "Chọn đối tượng đăng nhập BA CLUBS: Sinh viên hoặc Đại diện CLB / Quản trị viên." },
    ],
  }),
  component: ChooseRolePage,
});

function ChooseRolePage() {
  // Google OAuth của sinh viên quay về trang này nên vẫn phải xử lý đăng nhập ở đây
  useStudentLoginRedirect();

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-soft)] sm:p-12">
        <img src={logo.url} alt="Logo Học viện Ngân hàng" className="mx-auto h-28 w-auto" />
        <h1 className="mt-4 text-3xl font-extrabold text-primary">
          <span className="text-accent">BA</span> CLUBS
        </h1>
        <p className="mt-3 text-base font-semibold italic text-primary">Bạn là?</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            to="/dang-nhap-sinh-vien"
            className="rounded-xl bg-accent/30 px-6 py-3 text-base font-bold text-primary shadow-md transition hover:-translate-y-0.5 hover:bg-accent/50 hover:shadow-lg"
          >
            Sinh viên
          </Link>
          <Link
            to="/dang-nhap-clb"
            className="rounded-xl border bg-secondary/60 px-6 py-3 text-base font-bold text-primary shadow-md transition hover:-translate-y-0.5 hover:bg-secondary hover:shadow-lg"
          >
            Đại diện CLB
          </Link>
        </div>
        <p className="mt-5 text-xs font-semibold text-muted-foreground">Quản trị viên chọn "Đại diện CLB" để đăng nhập.</p>
      </div>
    </main>
  );
}
