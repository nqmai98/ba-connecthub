import { createFileRoute } from "@tanstack/react-router";
import { Empty, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/clb/bai-dang")({
  head: () => ({ meta: [{ title: "Bài đăng của tôi – BA CLUBS" }, { name: "description", content: "Bài đăng của tôi" }, { property: "og:title", content: "Bài đăng của tôi – BA CLUBS" }, { property: "og:description", content: "Bài đăng của tôi" }] }),
  component: () => (
    <RoleGate roles={["club_rep"]}>
      <Page title="Bài đăng của tôi"><Empty text="Chức năng đang được hoàn thiện ở bước tiếp theo." /></Page>
    </RoleGate>
  ),
});
