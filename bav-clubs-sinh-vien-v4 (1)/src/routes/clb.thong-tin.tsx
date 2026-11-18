import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { ClubForm, clbSangDraft } from "@/components/forms";
import { useCLBCuaToi } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clb/thong-tin")({
  head: () => ({
    meta: [
      { title: "Thông tin CLB – BAV CLUBS" },
      { name: "description", content: "Gửi yêu cầu cập nhật thông tin giới thiệu câu lạc bộ." },
      { property: "og:title", content: "Thông tin CLB – BAV CLUBS" },
      {
        property: "og:description",
        content: "Gửi yêu cầu cập nhật thông tin giới thiệu câu lạc bộ.",
      },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <ClubInfo />
    </RoleGate>
  ),
});

function ClubInfo() {
  const { club, isLoading } = useCLBCuaToi();
  const qc = useQueryClient();

  return (
    <Page
      title="Thông tin CLB"
      subtitle="Thay đổi được gửi tới Quản trị viên duyệt trước khi công khai"
      actions={
        <Button asChild variant="outline">
          <Link to="/clb/yeu-cau">Xem các yêu cầu đã gửi</Link>
        </Button>
      }
    >
      {isLoading ? (
        <GridSkeleton n={1} />
      ) : !club ? (
        <Empty text="Tài khoản chưa được gán CLB nào" />
      ) : (
        <Card className="max-w-3xl">
          <ClubForm
            key={club.MaCLB}
            initial={clbSangDraft(club)}
            cheDo="yeu-cau"
            onSaved={() => qc.invalidateQueries({ queryKey: ["yeu_cau_cua_clb"] })}
          />
        </Card>
      )}
    </Page>
  );
}
