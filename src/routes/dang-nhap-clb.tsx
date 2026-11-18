import { createFileRoute, redirect } from "@tanstack/react-router";

/** Link cũ, giữ lại để không gãy đường dẫn đã gửi cho CLB: chuyển sang /clb/dang-nhap. */
export const Route = createFileRoute("/dang-nhap-clb")({
  beforeLoad: () => {
    throw redirect({ to: "/clb/dang-nhap", replace: true });
  },
});
