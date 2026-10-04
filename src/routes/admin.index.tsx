import { createFileRoute } from "@tanstack/react-router";
import { Empty, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard – BA CLUBS" }, { name: "description", content: "Dashboard" }, { property: "og:title", content: "Dashboard – BA CLUBS" }, { property: "og:description", content: "Dashboard" }] }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <Page title="Dashboard"><Empty text="Chức năng đang được hoàn thiện ở bước tiếp theo." /></Page>
    </RoleGate>
  ),
});
