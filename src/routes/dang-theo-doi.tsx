import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDateTime, useCauLacBo, useTheoDoi } from "@/lib/data";
import {
  Card,
  ClubLogo,
  Empty,
  FollowButton,
  GridSkeleton,
  NotifyToggle,
  Page,
  RoleGate,
} from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dang-theo-doi")({
  head: () => ({
    meta: [
      { title: "Đang theo dõi – BA CLUBS" },
      { name: "description", content: "Các câu lạc bộ bạn đang theo dõi." },
      { property: "og:title", content: "Đang theo dõi – BA CLUBS" },
      { property: "og:description", content: "Các câu lạc bộ bạn đang theo dõi." },
    ],
  }),
  component: () => (
    <RoleGate>
      <Following />
    </RoleGate>
  ),
});

function Following() {
  const { data: clubs, isLoading } = useCauLacBo();
  const { data: theoDoi, isLoading: l2 } = useTheoDoi();
  const list = (clubs ?? []).filter((c) => theoDoi?.has(c.MaCLB));

  return (
    <Page
      title="Đang theo dõi"
      subtitle="Bật thông báo để nhận tin khi câu lạc bộ đăng nội dung mới"
    >
      {isLoading || l2 ? (
        <GridSkeleton n={3} />
      ) : list.length ? (
        <div className="space-y-3">
          {list.map((c) => (
            <Card key={c.MaCLB} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/cau-lac-bo/$id"
                params={{ id: String(c.MaCLB) }}
                className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
              >
                <ClubLogo club={c} size={48} />
                <div className="min-w-0">
                  <div className="truncate font-bold text-primary">{c.TenCLB}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {c.linh_vuc?.TenLinhVuc} · Theo dõi từ{" "}
                    {formatDateTime(theoDoi?.get(c.MaCLB)?.NgayTheoDoi ?? null)}
                  </div>
                </div>
              </Link>
              <div className="flex shrink-0 flex-wrap gap-2">
                <NotifyToggle maCLB={c.MaCLB} />
                <FollowButton maCLB={c.MaCLB} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          text="Bạn chưa theo dõi câu lạc bộ nào"
          action={
            <Button asChild>
              <Link to="/cau-lac-bo">Tìm câu lạc bộ</Link>
            </Button>
          }
        />
      )}
    </Page>
  );
}
