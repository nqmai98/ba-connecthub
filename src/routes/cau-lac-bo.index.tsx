import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { NHAN_KHOI, useCauLacBo, useLinhVuc, useNhomToChuc, type KhoiToChuc } from "@/lib/data";
import { ClubCard, Empty, GridSkeleton, Page } from "@/components/common";
import { Button } from "@/components/ui/button";
import { FilterChip, FilterGroup, ResultBar, SearchBar, boDau } from "@/components/student/Filters";

const search = z.object({
  q: z.string().optional(),
  /** Cấp 1: Đoàn Thanh niên / Hội Sinh viên */
  khoi: z.enum(["DoanThanhNien", "HoiSinhVien"]).optional(),
  /** Cấp 2: nhóm trong sơ đồ tổ chức */
  nhom: z.coerce.number().int().optional(),
  linh_vuc: z.coerce.number().int().optional(),
});

type SearchCLB = z.infer<typeof search>;

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
  const { q = "", khoi, nhom, linh_vuc } = Route.useSearch();
  const navigate = useNavigate({ from: "/cau-lac-bo/" });
  const { data: linhVuc } = useLinhVuc();
  const { data: dsNhom } = useNhomToChuc();
  const { data: clubs, isLoading } = useCauLacBo();

  const nhomTheoMa = useMemo(() => new Map((dsNhom ?? []).map((n) => [n.MaNhom, n])), [dsNhom]);
  const khoiCua = (maNhom: number | null | undefined) =>
    maNhom != null ? nhomTheoMa.get(maNhom)?.Khoi : undefined;

  const conHoatDong = useMemo(
    () => (clubs ?? []).filter((c) => c.TrangThaiHoatDong !== "NgungHoatDong"),
    [clubs],
  );

  // Bước 1: từ khóa
  const theoTuKhoa = useMemo(() => {
    const k = boDau(q.trim());
    if (!k) return conHoatDong;
    return conHoatDong.filter((c) =>
      boDau(
        `${c.TenCLB} ${c.GioiThieuNgan ?? ""} ${c.MoTa ?? ""} ${c.DonViTrucThuoc ?? ""} ${c.linh_vuc?.TenLinhVuc ?? ""}`,
      ).includes(k),
    );
  }, [conHoatDong, q]);

  // Bước 2: cấp 1 (Đoàn / Hội)
  const theoKhoi = useMemo(
    () =>
      theoTuKhoa.filter(
        (c) => !khoi || (c.MaNhom != null && nhomTheoMa.get(c.MaNhom)?.Khoi === khoi),
      ),
    [theoTuKhoa, khoi, nhomTheoMa],
  );
  // Bước 3: cấp 2 (ô xanh trong sơ đồ)
  const theoNhom = useMemo(
    () => theoKhoi.filter((c) => !nhom || c.MaNhom === nhom),
    [theoKhoi, nhom],
  );
  // Bước 4: lĩnh vực
  const list = useMemo(
    () => theoNhom.filter((c) => !linh_vuc || c.MaLinhVuc === linh_vuc),
    [theoNhom, linh_vuc],
  );

  const coBoLocToChuc = (dsNhom ?? []).length > 0;
  const nhomCuaKhoi = (dsNhom ?? []).filter((n) => n.Khoi === khoi);
  const dangLoc = !!q || !!khoi || !!nhom || !!linh_vuc;
  const xoaLoc = () => navigate({ search: {} });
  const chonKhoi = (k: KhoiToChuc | undefined) =>
    navigate({ search: (p: SearchCLB) => ({ ...p, khoi: k, nhom: undefined }) });

  return (
    <Page
      title="Câu lạc bộ"
      subtitle="Khám phá các câu lạc bộ, liên chi đoàn, liên chi hội và đội nhóm tại Học viện Ngân hàng"
    >
      <div className="mb-6 space-y-4 rounded-2xl border border-white/70 bg-card/80 p-4 shadow-[var(--shadow-soft)] backdrop-blur sm:p-5">
        <SearchBar
          value={q}
          placeholder="Tìm theo tên câu lạc bộ hoặc từ khóa..."
          onSearch={(v) =>
            navigate({ search: (p: SearchCLB) => ({ ...p, q: v || undefined }), replace: true })
          }
        />

        {coBoLocToChuc && (
          <>
            {/* Cấp 1: Đoàn Thanh niên / Hội Sinh viên */}
            <FilterGroup label="Tổ chức">
              <FilterChip active={!khoi} count={theoTuKhoa.length} onClick={() => chonKhoi(undefined)}>
                Tất cả
              </FilterChip>
              {(Object.keys(NHAN_KHOI) as KhoiToChuc[]).map((k) => (
                <FilterChip
                  key={k}
                  active={khoi === k}
                  count={theoTuKhoa.filter((c) => khoiCua(c.MaNhom) === k).length}
                  onClick={() => chonKhoi(khoi === k ? undefined : k)}
                >
                  {NHAN_KHOI[k]}
                </FilterChip>
              ))}
            </FilterGroup>

            {/* Cấp 2: các đơn vị thuộc khối đã chọn */}
            {khoi && (
              <FilterGroup label="Đơn vị">
                <FilterChip
                  active={!nhom}
                  count={theoKhoi.length}
                  onClick={() => navigate({ search: (p: SearchCLB) => ({ ...p, nhom: undefined }) })}
                >
                  Tất cả
                </FilterChip>
                {nhomCuaKhoi.map((n) => (
                  <FilterChip
                    key={n.MaNhom}
                    active={nhom === n.MaNhom}
                    count={theoKhoi.filter((c) => c.MaNhom === n.MaNhom).length}
                    onClick={() =>
                      navigate({
                        search: (p: SearchCLB) => ({
                          ...p,
                          nhom: p.nhom === n.MaNhom ? undefined : n.MaNhom,
                        }),
                      })
                    }
                  >
                    {n.TenNhom}
                  </FilterChip>
                ))}
              </FilterGroup>
            )}
          </>
        )}

        <FilterGroup label="Lĩnh vực">
          <FilterChip
            active={!linh_vuc}
            count={theoNhom.length}
            onClick={() => navigate({ search: (p: SearchCLB) => ({ ...p, linh_vuc: undefined }) })}
          >
            Tất cả
          </FilterChip>
          {(linhVuc ?? []).map((lv) => (
            <FilterChip
              key={lv.MaLinhVuc}
              title={lv.MoTa ?? undefined}
              active={linh_vuc === lv.MaLinhVuc}
              count={theoNhom.filter((c) => c.MaLinhVuc === lv.MaLinhVuc).length}
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
