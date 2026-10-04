import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import { useCategories, useClubs, useEvents } from "@/lib/data";
import { ClubCard, Empty, EventCard, GridSkeleton } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BA CLUBS – Câu lạc bộ & sự kiện Học viện Ngân hàng" },
      { name: "description", content: "Khám phá câu lạc bộ, liên chi đoàn, đội nhóm và sự kiện sắp diễn ra tại Học viện Ngân hàng." },
      { property: "og:title", content: "BA CLUBS – Câu lạc bộ & sự kiện Học viện Ngân hàng" },
      { property: "og:description", content: "Khám phá câu lạc bộ, đội nhóm và sự kiện sắp diễn ra tại Học viện Ngân hàng." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: cats } = useCategories();
  const { data: clubs, isLoading } = useClubs();
  const { data: events, isLoading: evLoading } = useEvents({ upcoming: true });
  const featured = (clubs ?? []).filter((c) => c.is_active && c.is_featured).slice(0, 6);

  return (
    <main>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:py-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-accent">Học viện Ngân hàng</p>
            <h1 className="mt-2 text-3xl leading-tight sm:text-5xl">
              Tìm câu lạc bộ <span className="text-accent">dành cho bạn</span>
            </h1>
            <p className="mt-4 max-w-xl font-medium text-primary-foreground/80">
              Tra cứu câu lạc bộ, liên chi đoàn, liên chi hội và đội nhóm. Theo dõi hoạt động, lưu sự kiện yêu thích vào lịch cá nhân.
            </p>
            <Button asChild size="lg" className="mt-6 bg-accent font-extrabold text-accent-foreground hover:bg-accent/90">
              <Link to="/cau-lac-bo"><Search className="h-5 w-5" /> Tìm câu lạc bộ</Link>
            </Button>
          </div>
          <img src={logo.url} alt="Logo BAV" className="mx-auto hidden h-56 w-auto drop-shadow-xl md:block" />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-3 py-8 sm:px-6">
        <section>
          <h2 className="mb-3 text-lg">Lọc nhanh theo lĩnh vực</h2>
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            {(cats ?? []).map((c) => (
              <Link
                key={c.id}
                to="/cau-lac-bo"
                search={{ linh_vuc: c.id }}
                className="shrink-0 rounded-full border bg-card px-4 py-2 text-sm font-bold text-primary hover:border-primary hover:bg-secondary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl">CLB nổi bật</h2>
            <Link to="/cau-lac-bo" className="text-sm font-bold text-primary hover:underline">Xem tất cả</Link>
          </div>
          {isLoading ? <GridSkeleton /> : featured.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((c) => <ClubCard key={c.id} club={c} />)}</div>
          ) : <Empty text="Chưa có câu lạc bộ nổi bật" />}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl">Sự kiện sắp diễn ra</h2>
            <Link to="/su-kien" className="text-sm font-bold text-primary hover:underline">Xem tất cả</Link>
          </div>
          {evLoading ? <GridSkeleton n={3} /> : events?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{events.slice(0, 6).map((e) => <EventCard key={e.id} post={e} />)}</div>
          ) : <Empty text="Chưa có sự kiện sắp diễn ra" />}
        </section>
      </div>
    </main>
  );
}
