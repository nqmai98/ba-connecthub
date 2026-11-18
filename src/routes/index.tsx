import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCauLacBo, useLinhVuc, useSuKien } from "@/lib/data";
import { ClubCard, Empty, EventCard, GridSkeleton } from "@/components/common";
import { HotEventsBanner } from "@/components/student/HotEventsBanner";
import { ClubSearchBox } from "@/components/student/Filters";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BAV CLUBS – Câu lạc bộ & sự kiện Học viện Ngân hàng" },
      {
        name: "description",
        content:
          "Khám phá câu lạc bộ, liên chi đoàn, đội nhóm và sự kiện sắp diễn ra tại Học viện Ngân hàng.",
      },
      { property: "og:title", content: "BAV CLUBS – Câu lạc bộ & sự kiện Học viện Ngân hàng" },
      {
        property: "og:description",
        content: "Khám phá câu lạc bộ, đội nhóm và sự kiện sắp diễn ra tại Học viện Ngân hàng.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: linhVuc } = useLinhVuc();
  const { data: clubs, isLoading } = useCauLacBo();
  const { data: suKien, isLoading: evLoading } = useSuKien({ sapDienRa: true });
  const dangHoatDong = (clubs ?? []).filter((c) => c.TrangThaiHoatDong !== "NgungHoatDong");
  const noiBat = dangHoatDong.filter((c) => c.NoiBat).slice(0, 6);
  const demTheoLinhVuc = new Map<number, number>();
  dangHoatDong.forEach((c) => demTheoLinhVuc.set(c.MaLinhVuc, (demTheoLinhVuc.get(c.MaLinhVuc) ?? 0) + 1));

  return (
    <main>
      <HotEventsBanner />

      <div className="mx-auto max-w-7xl space-y-12 px-3 py-8 sm:px-6 sm:py-10">
        {/* Tìm kiếm + lọc nhanh theo lĩnh vực (PTTKHT – ca sử dụng Tìm kiếm & xem chi tiết CLB) */}
        <section className="-mt-14 rounded-3xl border border-white/70 bg-card/85 p-4 shadow-[0_18px_50px_-24px_rgb(31_35_95/0.55)] backdrop-blur sm:-mt-16 sm:p-6">
          <ClubSearchBox />
          <h2 className="mb-3 mt-5 text-base text-foreground">Lọc nhanh theo lĩnh vực</h2>
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            {(linhVuc ?? []).map((lv) => (
              <Link
                key={lv.MaLinhVuc}
                to="/cau-lac-bo"
                search={{ linh_vuc: lv.MaLinhVuc }}
                title={lv.MoTa ?? undefined}
                className="group inline-flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_20px_-12px_rgb(41_45_120/0.7)]"
              >
                {lv.TenLinhVuc}
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                  {demTheoLinhVuc.get(lv.MaLinhVuc) ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="CLB nổi bật" to="/cau-lac-bo" />
          {isLoading ? (
            <GridSkeleton />
          ) : noiBat.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {noiBat.map((c) => (
                <ClubCard key={c.MaCLB} club={c} />
              ))}
            </div>
          ) : (
            <Empty text="Chưa có câu lạc bộ nổi bật" />
          )}
        </section>

        <section>
          <SectionHeader title="Sự kiện sắp diễn ra" to="/su-kien" />
          {evLoading ? (
            <GridSkeleton n={3} />
          ) : suKien?.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {suKien.slice(0, 6).map((e) => (
                <EventCard key={e.MaBaiDang} suKien={e} />
              ))}
            </div>
          ) : (
            <Empty text="Chưa có sự kiện sắp diễn ra" />
          )}
        </section>
      </div>
    </main>
  );
}

function SectionHeader({ title, to }: { title: ReactNode; to: "/cau-lac-bo" | "/su-kien" }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="flex items-center gap-3 text-xl sm:text-2xl">
        <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-accent to-primary" />
        {title}
      </h2>
      <Link to={to} className="text-sm font-bold text-primary hover:underline">
        Xem tất cả
      </Link>
    </div>
  );
}
