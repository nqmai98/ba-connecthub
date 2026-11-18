import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/common";
import { HoSoNguoiDung } from "@/components/HoSoNguoiDung";

export const Route = createFileRoute("/admin/ho-so")({
  head: () => ({
    meta: [
      { title: "Hồ sơ quản trị viên – BAV CLUBS" },
      { name: "description", content: "Thông tin tài khoản Quản trị viên BAV CLUBS." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <HoSoNguoiDung khu="admin" />
    </RoleGate>
  ),
});
