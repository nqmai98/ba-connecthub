import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import { formatDateTime, formatKhoangThoiGian, useBaiDangCuaCLB, useBaiViet } from "@/lib/data";
import { vanBanThuan } from "@/lib/noi-dung";
import {
  ClubLogo,
  Empty,
  FavoriteButton,
  FollowButton,
  GridSkeleton,
  LoaiBaiDangBadge,
  LoaiSuKienBadge,
  TrangThaiKiemDuyetBadge,
} from "@/components/common";
import { NoiDungBaiViet } from "@/components/NoiDungBaiViet";
import { TheTin } from "@/components/TheTin";

export const Route = createFileRoute("/bai-viet/$id")({
  head: () => ({
    meta: [
      { title: "Bài viết – BAV CLUBS" },
      { name: "description", content: "Tin tức, sự kiện và hoạt động của các câu lạc bộ Học viện Ngân hàng." },
    ],
  }),
  component: TrangBaiViet,
});

/**
 * Trang đọc bài dạng trang tin: ảnh bìa, tiêu đề, CLB đăng, thời gian, nội dung có định dạng
 * và nhiều ảnh xen giữa bài; với sự kiện có thêm khung thời gian – địa điểm – nút Yêu thích.
 */
function TrangBaiViet() {
  const { id } = Route.useParams();
  const ma = Number(id);
  const { data: bai, isLoading } = useBaiViet(ma);
  const { data: cungCLB } = useBaiDangCuaCLB(bai?.MaCLB ?? 0);

  if (isLoading)
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <GridSkeleton n={1} />
      </main>
    );
  if (!bai)
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Empty text="Bài viết không tồn tại hoặc chưa được duyệt" />
      </main>
    );

  const tuChu = vanBanThuan(bai.NoiDung).split(/\s+/).filter(Boolean).length;
  const phutDoc = Math.max(1, Math.round(tuChu / 220));
  const khac = (cungCLB ?? []).filter((b) => b.MaBaiDang !== bai.MaBaiDang).slice(0, 3);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      {bai.cau_lac_bo && (
        <Link
          to="/cau-lac-bo/$id"
          params={{ id: String(bai.MaCLB) }}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {bai.cau_lac_bo.TenCLB}
        </Link>
      )}

      <article className="mt-4 overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-soft)]">
        {bai.AnhBia && <img src={bai.AnhBia} alt="" className="max-h-[440px] w-full object-cover" />}
        <div className="p-5 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <LoaiBaiDangBadge loai={bai.LoaiBaiDang} />
            {bai.su_kien && <LoaiSuKienBadge loai={bai.su_kien.LoaiSuKien} />}
            {bai.TrangThaiKiemDuyet !== "DaDuyet" && <TrangThaiKiemDuyetBadge trangThai={bai.TrangThaiKiemDuyet} />}
          </div>
          <h1 className="mt-3 text-2xl leading-tight sm:text-4xl">{bai.TieuDe}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-5 text-sm">
            {bai.cau_lac_bo && (
              <Link
                to="/cau-lac-bo/$id"
                params={{ id: String(bai.MaCLB) }}
                className="flex items-center gap-2 font-bold text-primary hover:underline"
              >
                <ClubLogo club={bai.cau_lac_bo} size={36} />
                {bai.cau_lac_bo.TenCLB}
              </Link>
            )}
            <span className="font-semibold text-muted-foreground">{formatDateTime(bai.NgayDang ?? bai.NgayTao)}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
              <Clock className="h-4 w-4" /> {phutDoc} phút đọc
            </span>
            <span className="ml-auto">
              <FollowButton maCLB={bai.MaCLB} />
            </span>
          </div>

          {bai.su_kien && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border-l-4 border-l-accent bg-accent/10 p-4 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-1.5 text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-primary" />
                  {formatKhoangThoiGian(bai.su_kien.ThoiGianBatDau, bai.su_kien.ThoiGianKetThuc)}
                </div>
                {bai.su_kien.DiaDiem && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    {bai.su_kien.DiaDiem}
                  </div>
                )}
              </div>
              <FavoriteButton maBaiDang={bai.MaBaiDang} />
            </div>
          )}

          <NoiDungBaiViet noiDung={bai.NoiDung} className="mt-6 text-[16px] sm:text-[17px]" />
        </div>
      </article>

      {khac.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg">Bài khác của {bai.cau_lac_bo?.TenCLB}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {khac.map((b) => (
              <TheTin key={b.MaBaiDang} bai={b} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
