import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarClock, Facebook, Mail, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  NHAN_TRANG_THAI_HOAT_DONG,
  formatDateTime,
  useBaiDangCuaCLB,
  type CauLacBo,
  type SuKien,
} from "@/lib/data";
import {
  Card,
  ClubLogo,
  Empty,
  EventCard,
  FollowButton,
  LoaiBaiDangBadge,
  NotifyToggle,
} from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/cau-lac-bo/$id")({
  head: () => ({
    meta: [
      { title: "Chi tiết câu lạc bộ – BAV CLUBS" },
      {
        name: "description",
        content:
          "Giới thiệu, thành tích, tin tức và sự kiện của câu lạc bộ tại Học viện Ngân hàng.",
      },
      { property: "og:title", content: "Chi tiết câu lạc bộ – BAV CLUBS" },
      {
        property: "og:description",
        content: "Giới thiệu, thành tích, tin tức và sự kiện của câu lạc bộ.",
      },
    ],
  }),
  component: ClubDetail,
});

function ClubDetail() {
  const { id } = Route.useParams();
  const maCLB = Number(id);
  const hopLe = Number.isInteger(maCLB) && maCLB > 0;

  const club = useQuery({
    queryKey: ["cau_lac_bo", maCLB],
    enabled: hopLe,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cau_lac_bo")
        .select("*, linh_vuc(TenLinhVuc)")
        .eq("MaCLB", maCLB)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as CauLacBo | null) ?? null;
    },
  });
  const posts = useBaiDangCuaCLB(maCLB);
  const nguoiTheoDoi = useQuery({
    queryKey: ["nguoi_theo_doi", maCLB],
    enabled: hopLe,
    queryFn: async () => (await supabase.rpc("dem_nguoi_theo_doi", { _ma_clb: maCLB })).data ?? 0,
  });

  if (!hopLe)
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Empty text="Không tìm thấy câu lạc bộ" />
      </main>
    );

  if (club.isLoading)
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-3 py-8 sm:px-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </main>
    );

  const c = club.data;
  if (!c)
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Empty text="Không tìm thấy câu lạc bộ" />
      </main>
    );

  const all = posts.data ?? [];
  const suKien = all.filter((p) => p.LoaiBaiDang === "SuKien" && p.su_kien);
  const tinBai = all.filter((p) => p.LoaiBaiDang !== "SuKien");
  const lines = (s: string | null) =>
    (s ?? "")
      .split(/[,\n;]/)
      .map((x) => x.trim())
      .filter(Boolean);

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8">
      <Link to="/cau-lac-bo" className="text-sm font-bold text-primary hover:underline">
        ← Danh sách câu lạc bộ
      </Link>
      <Card className="mt-3 overflow-hidden p-0">
        {c.AnhBia ? (
          <img src={c.AnhBia} alt="" className="h-40 w-full object-cover sm:h-56" />
        ) : (
          <div className="h-24 bg-primary" />
        )}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ClubLogo club={c} size={80} />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl">{c.TenCLB}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-secondary-foreground">
                  {c.linh_vuc?.TenLinhVuc}
                </span>
                {c.TrangThaiHoatDong !== "DangHoatDong" && (
                  <span className="rounded-full bg-warning px-2 py-0.5 font-bold text-warning-foreground">
                    {NHAN_TRANG_THAI_HOAT_DONG[c.TrangThaiHoatDong]}
                  </span>
                )}
                {c.NamThanhLap && <span>Thành lập {c.NamThanhLap}</span>}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {nguoiTheoDoi.data ?? 0} người theo dõi
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <FollowButton maCLB={c.MaCLB} className="h-10 px-5" />
            <NotifyToggle maCLB={c.MaCLB} />
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="mb-2 text-lg">Giới thiệu</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{c.MoTa || c.GioiThieuNgan}</p>
          {c.ThanhTich && (
            <>
              <h2 className="mb-2 mt-5 text-lg">Thành tích nổi bật</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {lines(c.ThanhTich).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <div className="space-y-4">
          {c.BanChuyenMon && (
            <Card>
              <h2 className="mb-2 text-lg">Ban chuyên môn</h2>
              <div className="flex flex-wrap gap-2">
                {lines(c.BanChuyenMon).map((d) => (
                  <span
                    key={d}
                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <h2 className="mb-2 text-lg">Thông tin chung</h2>
            <div className="space-y-1.5 text-sm">
              {c.DonViTrucThuoc && (
                <p className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {c.DonViTrucThuoc}
                </p>
              )}
              {c.ThongTinLienHe && (
                <p className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="whitespace-pre-line">{c.ThongTinLienHe}</span>
                </p>
              )}
              {c.Fanpage && (
                <a
                  href={c.Fanpage.startsWith("http") ? c.Fanpage : `https://${c.Fanpage}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-start gap-2 font-bold text-primary hover:underline"
                >
                  <Facebook className="mt-0.5 h-4 w-4 shrink-0" />
                  Fanpage
                </a>
              )}
              <p className="flex items-start gap-2 text-muted-foreground">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                Cập nhật {formatDateTime(c.NgayCapNhat)}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl">Sự kiện</h2>
        {suKien.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {suKien.map((e) => (
              <EventCard key={e.MaBaiDang} suKien={{ ...e, ...e.su_kien! } as SuKien} />
            ))}
          </div>
        ) : (
          <Empty text="Câu lạc bộ chưa có sự kiện" />
        )}
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-xl">Tin tức & hoạt động</h2>
        {tinBai.length ? (
          <div className="space-y-3">
            {tinBai.map((n) => (
              <Card key={n.MaBaiDang}>
                <div className="flex flex-wrap items-center gap-2">
                  <LoaiBaiDangBadge loai={n.LoaiBaiDang} />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {formatDateTime(n.NgayDang ?? n.NgayTao)}
                  </span>
                </div>
                <h3 className="mt-1 text-base">{n.TieuDe}</h3>
                {n.AnhBia && (
                  <img
                    src={n.AnhBia}
                    alt=""
                    className="mt-3 max-h-72 w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                )}
                <p className="mt-2 whitespace-pre-line text-sm">{n.NoiDung}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Empty text="Câu lạc bộ chưa có tin tức" />
        )}
      </section>
    </main>
  );
}
