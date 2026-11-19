import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/common";
import { ThongBaoList } from "@/components/ThongBaoList";

export const Route = createFileRoute("/clb/thong-bao")({
  head: () => ({
    meta: [
      { title: "Thông báo – Đại diện CLB – BAV CLUBS" },
      { name: "description", content: "Thông báo dành cho Đại diện CLB trên BAV CLUBS." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <ThongBaoList />
    </RoleGate>
  ),
});
