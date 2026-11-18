import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/common";
import { HoSoNguoiDung } from "@/components/HoSoNguoiDung";

export const Route = createFileRoute("/clb/ho-so")({
  head: () => ({
    meta: [
      { title: "Hồ sơ – Đại diện CLB – BAV CLUBS" },
      { name: "description", content: "Thông tin tài khoản Đại diện CLB trên BAV CLUBS." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <HoSoNguoiDung khu="clb" />
    </RoleGate>
  ),
});
