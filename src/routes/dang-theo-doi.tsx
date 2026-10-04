import { createFileRoute, Link } from "@tanstack/react-router";
import { useClubs, useFollows } from "@/lib/data";
import { ClubCard, Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
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
  component: () => <RoleGate><Following /></RoleGate>,
});

function Following() {
  const { data: clubs, isLoading } = useClubs();
  const { data: follows, isLoading: l2 } = useFollows();
  const list = (clubs ?? []).filter((c) => follows?.has(c.id));
  return (
    <Page title="Đang theo dõi" subtitle="Bạn sẽ nhận thông báo khi các CLB này đăng tin hoặc sự kiện mới">
      {isLoading || l2 ? <GridSkeleton n={3} /> : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <ClubCard key={c.id} club={c} />)}</div>
      ) : <Empty text="Bạn chưa theo dõi câu lạc bộ nào" action={<Button asChild><Link to="/cau-lac-bo">Tìm câu lạc bộ</Link></Button>} />}
    </Page>
  );
}
