import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { ClubForm } from "@/components/forms";
import { useAuth } from "@/lib/auth";
import { useClubs } from "@/lib/data";

export const Route = createFileRoute("/clb/thong-tin")({
  head: () => ({ meta: [{ title: "Thông tin CLB – BA CLUBS" }, { name: "description", content: "Cập nhật thông tin giới thiệu câu lạc bộ." }, { property: "og:title", content: "Thông tin CLB – BA CLUBS" }, { property: "og:description", content: "Cập nhật thông tin giới thiệu câu lạc bộ." }] }),
  component: () => (
    <RoleGate roles={["club_rep"]}>
      <ClubInfo />
    </RoleGate>
  ),
});

function ClubInfo() {
  const { clubIds } = useAuth();
  const { data, isLoading } = useClubs();
  const qc = useQueryClient();
  const club = data?.find((c) => c.id === clubIds[0]);
  return (
    <Page title="Thông tin CLB" subtitle="Chỉnh sửa thông tin câu lạc bộ bạn phụ trách">
      {isLoading ? <GridSkeleton n={1} /> : !club ? <Empty text="Tài khoản chưa được gán CLB nào" /> : (
        <Card className="max-w-3xl">
          <ClubForm key={club.id} initial={(({ categories: _c, ...r }) => r)(club)} onSaved={() => qc.invalidateQueries({ queryKey: ["clubs"] })} />
        </Card>
      )}
    </Page>
  );
}
