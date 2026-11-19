import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/common";
import { HoSoNguoiDung } from "@/components/HoSoNguoiDung";

export const Route = createFileRoute("/ho-so")({
  head: () => ({
    meta: [
      { title: "Hồ sơ của tôi – BAV CLUBS" },
      { name: "description", content: "Thông tin tài khoản và hoạt động của bạn trên BAV CLUBS." },
      { property: "og:title", content: "Hồ sơ của tôi – BAV CLUBS" },
      { property: "og:description", content: "Thông tin tài khoản và hoạt động của bạn trên BAV CLUBS." },
    ],
  }),
  component: () => (
    <RoleGate>
      <HoSoNguoiDung />
    </RoleGate>
  ),
});
