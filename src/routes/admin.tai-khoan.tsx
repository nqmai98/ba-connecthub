import { createFileRoute } from "@tanstack/react-router";
import { Empty, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/admin/tai-khoan")({
  head: () => ({ meta: [{ title: "Quản lý tài khoản – BA CLUBS" }, { name: "description", content: "Quản lý tài khoản" }, { property: "og:title", content: "Quản lý tài khoản – BA CLUBS" }, { property: "og:description", content: "Quản lý tài khoản" }] }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <Page title="Quản lý tài khoản"><Empty text="Chức năng đang được hoàn thiện ở bước tiếp theo." /></Page>
    </RoleGate>
  ),
});
