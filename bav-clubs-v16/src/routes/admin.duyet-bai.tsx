import { createFileRoute, redirect } from "@tanstack/react-router";

/** Link cũ (thông báo cũ trỏ tới đây): chuyển sang trang Kiểm duyệt, tab Duyệt bài đăng. */
export const Route = createFileRoute("/admin/duyet-bai")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/kiem-duyet", search: { tab: "bai-dang" }, replace: true });
  },
});
