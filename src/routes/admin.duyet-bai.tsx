import { createFileRoute } from "@tanstack/react-router";
import { Empty, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/admin/duyet-bai")({
  head: () => ({ meta: [{ title: "Duyệt bài – BA CLUBS" }, { name: "description", content: "Duyệt bài" }, { property: "og:title", content: "Duyệt bài – BA CLUBS" }, { property: "og:description", content: "Duyệt bài" }] }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <Page title="Duyệt bài"><Empty text="Chức năng đang được hoàn thiện ở bước tiếp theo." /></Page>
    </RoleGate>
  ),
});
