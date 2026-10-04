import { createFileRoute } from "@tanstack/react-router";
import { Empty, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/clb/thong-tin")({
  head: () => ({ meta: [{ title: "Thông tin CLB – BA CLUBS" }, { name: "description", content: "Thông tin CLB" }, { property: "og:title", content: "Thông tin CLB – BA CLUBS" }, { property: "og:description", content: "Thông tin CLB" }] }),
  component: () => (
    <RoleGate roles={["club_rep"]}>
      <Page title="Thông tin CLB"><Empty text="Chức năng đang được hoàn thiện ở bước tiếp theo." /></Page>
    </RoleGate>
  ),
});
