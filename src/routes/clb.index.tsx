import { createFileRoute } from "@tanstack/react-router";
import { Empty, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/clb/")({
  head: () => ({ meta: [{ title: "Tổng quan CLB – BA CLUBS" }, { name: "description", content: "Tổng quan CLB" }, { property: "og:title", content: "Tổng quan CLB – BA CLUBS" }, { property: "og:description", content: "Tổng quan CLB" }] }),
  component: () => (
    <RoleGate roles={["club_rep"]}>
      <Page title="Tổng quan CLB"><Empty text="Chức năng đang được hoàn thiện ở bước tiếp theo." /></Page>
    </RoleGate>
  ),
});
