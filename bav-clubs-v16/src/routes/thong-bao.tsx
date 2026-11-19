import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/common";
import { ThongBaoList } from "@/components/ThongBaoList";

export const Route = createFileRoute("/thong-bao")({
  head: () => ({
    meta: [
      { title: "Thông báo – BAV CLUBS" },
      { name: "description", content: "Thông báo mới từ các câu lạc bộ và hệ thống." },
      { property: "og:title", content: "Thông báo – BAV CLUBS" },
      { property: "og:description", content: "Thông báo mới từ các câu lạc bộ và hệ thống." },
    ],
  }),
  component: () => (
    <RoleGate>
      <ThongBaoList />
    </RoleGate>
  ),
});

