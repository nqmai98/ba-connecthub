import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { useCauLacBo, useLinhVuc } from "@/lib/data";
import { ClubCard, Empty, GridSkeleton, Page } from "@/components/common";
import { Button } from "@/components/ui/button";
import { FilterChip, FilterGroup, ResultBar, SearchBar, boDau } from "@/components/student/Filters";

const search = z.object({ q: z.string().optional(), linh_vuc: z.coerce.number().int().optional() });

type SearchCLB = { q?: string | undefined; linh_vuc?: number | undefined };

export const Route = createFileRoute("/cau-lac-bo/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Danh sách câu lạc bộ – BAV CLUBS" },
      {
        name: "description",
        content: "Tìm kiếm câu lạc bộ theo tên và lĩnh vực tại Học viện Ngân hàng.",
      },
      { property: "og:title", content: "Danh sách câu lạc bộ – BAV CLUBS" },
      {
        property: "og:description",
        content: "Tìm kiếm câu lạc bộ theo tên và lĩnh vực tại Học viện Ngân hàng.",
      },
    ],
  }),
  component: ClubList,
});

/**
 * Danh sách CLB theo kịch bản "Tìm kiếm và xem chi tiết câu lạc bộ" (PTTKHT):
 *  - Luồng con 1: nhập từ khóa -> bấm "Tìm kiếm" -> lọc theo tên/giới thiệu/đơn vị trực thuộc
 *  - Luồng con 2: chọn lĩnh vực hoạt động -> danh sách cập nhật ngay, có thể đổi bộ lọc tiếp
 *  - Không có kết quả -> "Không tìm thấy câu lạc bộ phù hợp"
 * Chỉ hiển thị CLB chưa ngừng hoạt động. Bộ lọc được giữ trên URL để chia sẻ/quay lại được.
 */
function ClubList() {
  const { q = "", linh_vuc } = Route.useSearch();
  const navigate = useNavigate({ from: "/cau-lac-bo/" });
  const { data: linhVuc } = useLinhVuc();
  const { data: clubs, isLoading } = useCauLacBo();

  const conHoatDong = useMemo(
    () => (clubs ?? []).filter((c) => c.TrangThaiHoatDong !== "NgungHoatDong"),
    [clubs],
  );

  // Kết quả sau tìm kiếm từ khóa (để đếm số CLB theo từng lĩnh vực trên chip)
  const theoTuKhoa = useMemo(() => {
    const k = boDau(q.trim());
    if (!k) return conHoatDong;
    return conHoatDong.filter((c) =>
      boDau(
        `${c.TenCLB} ${c.GioiThieuNgan ?? ""} ${c.MoTa ?? ""} ${c.DonViTrucThuoc ?? ""} ${c.linh_vuc?.TenLinhVuc ?? ""}`,
      ).includes(k),
    );
  }, [conHoatDong, q]);

  const list = useMemo(
    () => theoTuKhoa.filter((c) => !linh_vuc || c.MaLinhVuc === linh_vuc),
    [theoTuKhoa, linh_vuc],
  );

  const dem = (ma: number) => theoTuKhoa.filter((c) => c.MaLinhVuc === ma).length;
  const dangLoc = !!q || !!linh_vuc;
  const xoaLoc = () => navigate({ search: {} });

  return (
    <Page title="Câu lạc bộ" subtitle="Khám phá các câu lạc bộ, liên chi đoàn, liên chi hội và đội nhóm tại Học viện Ngân hàng">
      <div className="mb-6 space-y-4 rounded-2xl border border-white/70 bg-card/80 p-4 shadow-[var(--shadow-soft)] backdrop-blur sm:p-5">
        <SearchBar
          value={q}
          placeholder="Tìm theo tên câu lạc bộ hoặc từ khóa..."
          onSearch={(v) =>
            navigate({ search: (p: SearchCLB) => ({ ...p, q: v || undefined }), replace: true })
          }
        />
        <FilterGroup label="Lĩnh vực">
          <FilterChip
            active={!linh_vuc}
            count={theoTuKhoa.length}
            onClick={() => navigate({ search: (p: SearchCLB) => ({ ...p, linh_vuc: undefined }) })}
          >
            Tất cả
          </FilterChip>
          {(linhVuc ?? []).map((lv) => (
            <FilterChip
              key={lv.MaLinhVuc}
              title={lv.MoTa ?? undefined}
              active={linh_vuc === lv.MaLinhVuc}
              count={dem(lv.MaLinhVuc)}
              onClick={() =>
                navigate({
                  search: (p: SearchCLB) => ({
                    ...p,
                    linh_vuc: p.linh_vuc === lv.MaLinhVuc ? undefined : lv.MaLinhVuc,
                  }),
                })
              }
            >
              {lv.TenLinhVuc}
            </FilterChip>
          ))}
        </FilterGroup>
      </div>

      {isLoading ? (
        <GridSkeleton />
      ) : (
        <>
          <ResultBar count={list.length} unit="câu lạc bộ" filtering={dangLoc} onClear={xoaLoc} />
          {list.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <ClubCard key={c.MaCLB} club={c} />
              ))}
            </div>
          ) : (
            <Empty
              text="Không tìm thấy câu lạc bộ phù hợp"
              action={
                dangLoc ? (
                  <Button variant="outline" onClick={xoaLoc}>
                    Xóa bộ lọc và tìm lại
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
