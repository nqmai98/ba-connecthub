import { createFileRoute, redirect } from "@tanstack/react-router";

/** Link cũ, giữ lại để không gãy đường dẫn đã chia sẻ: chuyển thẳng về /dang-nhap. */
export const Route = createFileRoute("/dang-nhap-sinh-vien")({
  beforeLoad: () => {
    throw redirect({ to: "/dang-nhap", replace: true });
  },
});
