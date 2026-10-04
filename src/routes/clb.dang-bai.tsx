import { createFileRoute } from "@tanstack/react-router";
import { Empty, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/clb/dang-bai")({
  head: () => ({ meta: [{ title: "Đăng bài – BA CLUBS" }, { name: "description", content: "Đăng bài" }, { property: "og:title", content: "Đăng bài – BA CLUBS" }, { property: "og:description", content: "Đăng bài" }] }),
  component: () => (
    <RoleGate roles={["club_rep"]}>
      <Page title="Đăng bài"><Empty text="Chức năng đang được hoàn thiện ở bước tiếp theo." /></Page>
    </RoleGate>
  ),
});
