import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NHAN_LOAI_SU_KIEN, useSuKien, type LoaiSuKien } from "@/lib/data";
import { Empty, EventCard, GridSkeleton, Page } from "@/components/common";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/su-kien")({
  head: () => ({
    meta: [
      { title: "Sự kiện – BA CLUBS" },
      {
        name: "description",
        content:
          "Các sự kiện học thuật và phi học thuật do câu lạc bộ tại Học viện Ngân hàng tổ chức.",
      },
      { property: "og:title", content: "Sự kiện – BA CLUBS" },
      {
        property: "og:description",
        content: "Các sự kiện do câu lạc bộ tại Học viện Ngân hàng tổ chức.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const [sapDienRa, setSapDienRa] = useState(true);
  const [loai, setLoai] = useState<LoaiSuKien | "TatCa">("TatCa");
  const { data, isLoading } = useSuKien({ sapDienRa });

  const list = useMemo(
    () => (data ?? []).filter((e) => loai === "TatCa" || e.LoaiSuKien === loai),
    [data, loai],
  );

  const tab = (a: boolean) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-bold",
      a ? "bg-primary text-primary-foreground" : "bg-card border text-primary",
    );

  return (
    <Page
      title="Sự kiện"
      subtitle="Bấm ☆ Yêu thích để lưu sự kiện vào lịch cá nhân"
      actions={
        <div className="flex flex-wrap gap-2">
          <button className={tab(sapDienRa)} onClick={() => setSapDienRa(true)}>
            Sắp diễn ra
          </button>
          <button className={tab(!sapDienRa)} onClick={() => setSapDienRa(false)}>
            Tất cả
          </button>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <button className={tab(loai === "TatCa")} onClick={() => setLoai("TatCa")}>
          Mọi loại sự kiện
        </button>
        {(Object.keys(NHAN_LOAI_SU_KIEN) as LoaiSuKien[]).map((t) => (
          <button key={t} className={tab(loai === t)} onClick={() => setLoai(t)}>
            {NHAN_LOAI_SU_KIEN[t]}
          </button>
        ))}
      </div>
      {isLoading ? (
        <GridSkeleton />
      ) : list.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((e) => (
            <EventCard key={e.MaBaiDang} suKien={e} />
          ))}
        </div>
      ) : (
        <Empty text="Chưa có sự kiện nào" />
      )}
    </Page>
  );
}
