import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/common";
import { ThongBaoList } from "@/components/ThongBaoList";

export const Route = createFileRoute("/admin/thong-bao")({
  head: () => ({
    meta: [
      { title: "Thông báo – Quản trị BAV CLUBS" },
      { name: "description", content: "Thông báo dành cho Quản trị viên BAV CLUBS." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <ThongBaoList />
    </RoleGate>
  ),
});
