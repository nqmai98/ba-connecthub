import { createFileRoute, redirect } from "@tanstack/react-router";

/** Link cũ (thông báo cũ trỏ tới đây): chuyển sang trang Kiểm duyệt, tab Duyệt thay đổi thông tin. */
export const Route = createFileRoute("/admin/yeu-cau")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/kiem-duyet", search: { tab: "thong-tin" }, replace: true });
  },
});
