import { createFileRoute } from "@tanstack/react-router";
import { Empty, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/admin/clb")({
  head: () => ({ meta: [{ title: "Quản lý CLB – BA CLUBS" }, { name: "description", content: "Quản lý CLB" }, { property: "og:title", content: "Quản lý CLB – BA CLUBS" }, { property: "og:description", content: "Quản lý CLB" }] }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <Page title="Quản lý CLB"><Empty text="Chức năng đang được hoàn thiện ở bước tiếp theo." /></Page>
    </RoleGate>
  ),
});
