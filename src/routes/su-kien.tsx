import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useEvents } from "@/lib/data";
import { Empty, EventCard, GridSkeleton, Page } from "@/components/common";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/su-kien")({
  head: () => ({
    meta: [
      { title: "Sự kiện – BA CLUBS" },
      { name: "description", content: "Các sự kiện do câu lạc bộ tại Học viện Ngân hàng tổ chức." },
      { property: "og:title", content: "Sự kiện – BA CLUBS" },
      { property: "og:description", content: "Các sự kiện do câu lạc bộ tại Học viện Ngân hàng tổ chức." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const [upcoming, setUpcoming] = useState(true);
  const { data, isLoading } = useEvents({ upcoming });
  const tab = (a: boolean) => cn("rounded-lg px-4 py-2 text-sm font-bold", a ? "bg-primary text-primary-foreground" : "bg-card border text-primary");
  return (
    <Page
      title="Sự kiện"
      subtitle="Bấm ☆ Yêu thích để lưu sự kiện vào lịch cá nhân"
      actions={
        <div className="flex gap-2">
          <button className={tab(upcoming)} onClick={() => setUpcoming(true)}>Sắp diễn ra</button>
          <button className={tab(!upcoming)} onClick={() => setUpcoming(false)}>Tất cả</button>
        </div>
      }
    >
      {isLoading ? <GridSkeleton /> : data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((e) => <EventCard key={e.id} post={e} />)}</div>
      ) : <Empty text="Chưa có sự kiện nào" />}
    </Page>
  );
}
