import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NHAN_LOAI_SU_KIEN, useSuKien, type LoaiSuKien } from "@/lib/data";
import { Empty, EventCard, GridSkeleton, Page } from "@/components/common";
import { Button } from "@/components/ui/button";
import { vanBanThuan } from "@/lib/noi-dung";
import { FilterChip, FilterGroup, ResultBar, SearchBar, boDau } from "@/components/student/Filters";

export const Route = createFileRoute("/su-kien")({
  head: () => ({
    meta: [
      { title: "Sự kiện – BAV CLUBS" },
      {
        name: "description",
        content:
          "Các sự kiện học thuật và phi học thuật do câu lạc bộ tại Học viện Ngân hàng tổ chức.",
      },
      { property: "og:title", content: "Sự kiện – BAV CLUBS" },
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
  const [q, setQ] = useState("");
  const { data, isLoading } = useSuKien({ sapDienRa });

  const theoTuKhoa = useMemo(() => {
    const k = boDau(q);
    if (!k) return data ?? [];
    return (data ?? []).filter((e) =>
      boDau(`${e.TieuDe} ${vanBanThuan(e.NoiDung)} ${e.DiaDiem ?? ""} ${e.cau_lac_bo?.TenCLB ?? ""}`).includes(k),
    );
  }, [data, q]);

  const list = useMemo(
    () => theoTuKhoa.filter((e) => loai === "TatCa" || e.LoaiSuKien === loai),
    [theoTuKhoa, loai],
  );

  const dangLoc = !!q || loai !== "TatCa";
  const xoaLoc = () => {
    setQ("");
    setLoai("TatCa");
  };

  return (
    <Page title="Sự kiện" subtitle="Bấm ☆ Yêu thích để lưu sự kiện vào lịch cá nhân">
      <div className="mb-6 space-y-4 rounded-2xl border border-white/70 bg-card/80 p-4 shadow-[var(--shadow-soft)] backdrop-blur sm:p-5">
        <SearchBar value={q} onSearch={setQ} placeholder="Tìm theo tên sự kiện, địa điểm hoặc CLB tổ chức..." />
        <FilterGroup label="Thời gian">
          <FilterChip active={sapDienRa} onClick={() => setSapDienRa(true)}>
            Sắp diễn ra
          </FilterChip>
          <FilterChip active={!sapDienRa} onClick={() => setSapDienRa(false)}>
            Tất cả
          </FilterChip>
        </FilterGroup>
        <FilterGroup label="Loại sự kiện">
          <FilterChip active={loai === "TatCa"} count={theoTuKhoa.length} onClick={() => setLoai("TatCa")}>
            Tất cả
          </FilterChip>
          {(Object.keys(NHAN_LOAI_SU_KIEN) as LoaiSuKien[]).map((t) => (
            <FilterChip
              key={t}
              active={loai === t}
              count={theoTuKhoa.filter((e) => e.LoaiSuKien === t).length}
              onClick={() => setLoai(t)}
            >
              {NHAN_LOAI_SU_KIEN[t]}
            </FilterChip>
          ))}
        </FilterGroup>
      </div>

      {isLoading ? (
        <GridSkeleton />
      ) : (
        <>
          <ResultBar count={list.length} unit="sự kiện" filtering={dangLoc} onClear={xoaLoc} />
          {list.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((e) => (
                <EventCard key={e.MaBaiDang} suKien={e} />
              ))}
            </div>
          ) : (
            <Empty
              text={dangLoc ? "Không tìm thấy sự kiện phù hợp" : "Chưa có sự kiện nào"}
              action={
                dangLoc ? (
                  <Button variant="outline" onClick={xoaLoc}>
                    Xóa bộ lọc
                  </Button>
                ) : undefined
              }
            />
          )}
        </>
      )}
    </Page>
  );
}
