import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  Hourglass,
  Plus,
  Settings,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { dbMoi } from "@/lib/db-moi";
import { ClubLogo, Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { BoLocHocKi } from "@/components/BoLocHocKi";
import { useAuth } from "@/lib/auth";
import {
  formatDateTime,
  formatKhoangThoiGian,
  NHAN_TRANG_THAI_HOAT_DONG,
  useCauLacBo,
} from "@/lib/data";
import { cacThang, danhSachNamHoc, khoangHocKi, namHocCua, NHAN_HOC_KI, type HocKi } from "@/lib/hoc-ki";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clb/")({
  head: () => ({
    meta: [
      { title: "Tổng quan CLB – BAV CLUBS" },
      { name: "description", content: "Tổng quan hoạt động của câu lạc bộ." },
      { property: "og:title", content: "Tổng quan CLB – BAV CLUBS" },
      { property: "og:description", content: "Tổng quan hoạt động của câu lạc bộ." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <Overview />
    </RoleGate>
  ),
});

/** Cùng bảng màu 2 chuỗi với Dashboard Quản trị (đã kiểm tra tương phản & mù màu). */
const MAU = { tinBai: "#4152b8", suKien: "#c98208" };

/** Một dòng của hàm tuong_tac_clb: tương tác của một bài trong một ngày. */
type TuongTacNgay = {
  MaBaiDang: number;
  Ngay: string;
  LuotXem: number;
  LuotBinhLuan: number;
  LuotYeuThich: number;
};

type BaiTK = {
  MaBaiDang: number;
  TieuDe: string;
  LoaiBaiDang: string;
  TrangThaiKiemDuyet: "ChoDuyet" | "DaDuyet" | "TuChoi";
  NgayTao: string;
  NgayDang: string | null;
  su_kien: { ThoiGianBatDau: string; ThoiGianKetThuc: string; DiaDiem: string | null } | null;
  kiem_duyet: { KetQuaKiemDuyet: string; LyDoTuChoi: string | null; ThoiGianKiemDuyet: string }[];
};

/**
 * Tổng quan CLB (PTTKHT Hình 18) – mở rộng thành bảng phân tích cho Đại diện CLB:
 *  - lọc theo năm học / học kì,
 *  - người theo dõi mới theo tháng (bảng theo_doi_clb),
 *  - bài viết & sự kiện được duyệt theo tháng,
 *  - tình trạng kiểm duyệt: tỉ lệ được duyệt, thời gian chờ duyệt trung bình, lý do bị từ chối gần đây
 *    (PTTKHT câu hỏi 9: CLB cần theo dõi trạng thái kiểm duyệt để chủ động điều chỉnh nội dung),
 *  - mức độ hoàn thiện hồ sơ CLB và sự kiện sắp diễn ra.
 */
function Overview() {
  const { maCLB } = useAuth();
  const { data: clubs } = useCauLacBo();
  const clb = clubs?.find((c) => c.MaCLB === maCLB);
  const [namHoc, setNamHoc] = useState(() => namHocCua(new Date()));
  const [hocKi, setHocKi] = useState<HocKi>("ca-nam");

  const q = useQuery({
    queryKey: ["tong-quan-clb", maCLB],
    enabled: !!maCLB,
    queryFn: async () => {
      const [theoDoi, baiDang, yeuCau, tuongTac] = await Promise.all([
        supabase.from("theo_doi_clb").select("NgayTheoDoi").eq("MaCLB", maCLB!),
        supabase
          .from("bai_dang")
          .select(
            "MaBaiDang, TieuDe, LoaiBaiDang, TrangThaiKiemDuyet, NgayTao, NgayDang, su_kien(ThoiGianBatDau, ThoiGianKetThuc, DiaDiem), kiem_duyet(KetQuaKiemDuyet, LyDoTuChoi, ThoiGianKiemDuyet)",
          )
          .eq("MaCLB", maCLB!),
        supabase.from("yeu_cau_cap_nhat").select("TrangThaiXuLy").eq("MaCLB", maCLB!),
        // Lượt xem / yêu thích theo ngày (hàm tuong_tac_clb – migration 0009)
        dbMoi.rpc("tuong_tac_clb", { _ma_clb: maCLB! }),
      ]);
      return {
        theoDoi: (theoDoi.data ?? []).map((t) => t.NgayTheoDoi),
        bai: (baiDang.data ?? []) as unknown as BaiTK[],
        yeuCauCho: (yeuCau.data ?? []).filter((x) => x.TrangThaiXuLy === "ChoDuyet").length,
        // null = chưa đọc được số liệu tương tác (lỗi mạng / CSDL)
        tuongTac: tuongTac.error ? null : ((tuongTac.data ?? []) as TuongTacNgay[]),
      };
    },
  });

  const dsNamHoc = useMemo(
    () => danhSachNamHoc([...(q.data?.bai ?? []).map((b) => b.NgayTao), ...(q.data?.theoDoi ?? [])]),
    [q.data],
  );

  if (!maCLB)
    return (
      <Page title="Tổng quan CLB">
        <Empty text="Tài khoản chưa được gán CLB nào" />
      </Page>
    );
  if (q.isLoading || !q.data)
    return (
      <Page title="Tổng quan CLB">
        <GridSkeleton n={4} />
      </Page>
    );

  const { theoDoi, bai, yeuCauCho, tuongTac } = q.data;
  const now = Date.now();
  const [tu, den] = khoangHocKi(namHoc, hocKi);
  const tenKy = `${NHAN_HOC_KI[hocKi]} · ${namHoc}–${namHoc + 1}`;
  const trong = (iso: string) => {
    const t = new Date(iso);
    return t >= tu && t < den;
  };
  // Bài viết tính theo ngày gửi; sự kiện tính theo ngày diễn ra (giống Dashboard Quản trị)
  const moc = (b: BaiTK) => (b.LoaiBaiDang === "SuKien" && b.su_kien ? b.su_kien.ThoiGianBatDau : b.NgayTao);
  const baiKy = bai.filter((b) => trong(moc(b)));
  const duyetKy = baiKy.filter((b) => b.TrangThaiKiemDuyet === "DaDuyet");
  const tinBaiKy = duyetKy.filter((b) => b.LoaiBaiDang !== "SuKien");
  const suKienKy = duyetKy.filter((b) => b.LoaiBaiDang === "SuKien");
  const theoDoiMoi = theoDoi.filter(trong).length;

  // ---- Tương tác: lượt xem, yêu thích (đếm theo ngày phát sinh) ----
  // "Ngay" là ngày theo giờ Việt Nam dạng YYYY-MM-DD; đặt 12:00 để không lệch ngày khi so khoảng.
  const ttKy = (tuongTac ?? []).filter((r) => trong(`${r.Ngay}T12:00:00+07:00`));
  const tong = (ds: typeof ttKy, k: "LuotXem" | "LuotYeuThich") =>
    ds.reduce((a, r) => a + r[k], 0);
  const xemKy = tong(ttKy, "LuotXem");
  const yeuThichKy = tong(ttKy, "LuotYeuThich");
  const yeuThichTong = tong(tuongTac ?? [], "LuotYeuThich");
  const theoBai = new Map<number, { xem: number; yt: number }>();
  (tuongTac ?? []).forEach((r) => {
    const t = theoBai.get(r.MaBaiDang) ?? { xem: 0, yt: 0 };
    theoBai.set(r.MaBaiDang, { xem: t.xem + r.LuotXem, yt: t.yt + r.LuotYeuThich });
  });
  const yeuThichTheoBai = new Map([...theoBai].map(([k, v]) => [k, v.yt]));
  const topYeuThich = bai
    .filter((b) => yeuThichTheoBai.get(b.MaBaiDang))
    .sort((a, b) => (yeuThichTheoBai.get(b.MaBaiDang) ?? 0) - (yeuThichTheoBai.get(a.MaBaiDang) ?? 0))
    .slice(0, 3);
  // Bài được quan tâm nhất trong kỳ: lượt xem + 3 × yêu thích (giống banner trang chủ)
  const diemKy = new Map<number, { xem: number; diem: number }>();
  ttKy.forEach((r) => {
    const t = diemKy.get(r.MaBaiDang) ?? { xem: 0, diem: 0 };
    diemKy.set(r.MaBaiDang, {
      xem: t.xem + r.LuotXem,
      diem: t.diem + r.LuotXem + 3 * r.LuotYeuThich,
    });
  });
  const topQuanTam = bai
    .filter((b) => diemKy.get(b.MaBaiDang)?.diem)
    .sort((a, b) => diemKy.get(b.MaBaiDang)!.diem - diemKy.get(a.MaBaiDang)!.diem)
    .slice(0, 5);

  // ---- Kiểm duyệt ----
  const daXuLy = baiKy.filter((b) => b.TrangThaiKiemDuyet !== "ChoDuyet");
  const tiLe = daXuLy.length ? Math.round((daXuLy.filter((b) => b.TrangThaiKiemDuyet === "DaDuyet").length / daXuLy.length) * 100) : null;
  const thoiGianCho = bai
    .flatMap((b) =>
      b.kiem_duyet.map((k) => new Date(k.ThoiGianKiemDuyet).getTime() - new Date(b.NgayTao).getTime()),
    )
    .filter((x) => x >= 0);
  const choTB = thoiGianCho.length ? thoiGianCho.reduce((a, b) => a + b, 0) / thoiGianCho.length / 3_600_000 : null;
  const choDuyet = bai.filter((b) => b.TrangThaiKiemDuyet === "ChoDuyet");
  const tuChoiGanDay = bai
    .filter((b) => b.TrangThaiKiemDuyet === "TuChoi")
    .map((b) => ({ b, k: [...b.kiem_duyet].sort((x, y) => y.ThoiGianKiemDuyet.localeCompare(x.ThoiGianKiemDuyet))[0] }))
    .sort((x, y) => (y.k?.ThoiGianKiemDuyet ?? "").localeCompare(x.k?.ThoiGianKiemDuyet ?? ""))
    .slice(0, 3);
  const demTT = (t: BaiTK["TrangThaiKiemDuyet"]) => baiKy.filter((b) => b.TrangThaiKiemDuyet === t).length;

  // ---- Biểu đồ theo tháng ----
  const thang = cacThang(tu, den);
  const cungThang = (iso: string, y: number, m: number) => {
    const t = new Date(iso);
    return t.getFullYear() === y && t.getMonth() === m;
  };
  const duLieuBai = thang.map(({ y, m, ten }) => ({
    ten,
    "Tin bài": tinBaiKy.filter((b) => cungThang(moc(b), y, m)).length,
    "Sự kiện": suKienKy.filter((b) => cungThang(moc(b), y, m)).length,
  }));
  const duLieuTheoDoi = thang.map(({ y, m, ten }) => ({
    ten,
    "Người theo dõi mới": theoDoi.filter((t) => cungThang(t, y, m)).length,
  }));

  // ---- Sự kiện sắp tới ----
  const sapToi = bai
    .filter((b) => b.TrangThaiKiemDuyet === "DaDuyet" && b.su_kien && new Date(b.su_kien.ThoiGianKetThuc).getTime() >= now)
    .sort((a, b) => a.su_kien!.ThoiGianBatDau.localeCompare(b.su_kien!.ThoiGianBatDau))
    .slice(0, 3);

  // ---- Hồ sơ CLB ----
  const hoSo: [string, boolean][] = clb
    ? [
        ["Logo", !!clb.LogoCLB],
        ["Ảnh bìa", !!clb.AnhBia],
        ["Giới thiệu ngắn", !!clb.GioiThieuNgan?.trim()],
        ["Giới thiệu chi tiết", !!clb.MoTa?.trim()],
        ["Đơn vị trực thuộc (sơ đồ Đoàn – Hội)", clb.MaDonVi != null],
        ["Năm thành lập", !!clb.NamThanhLap],
        ["Thông tin liên hệ", !!clb.ThongTinLienHe?.trim() || !!clb.Fanpage?.trim()],
      ]
    : [];
  const phanTram = hoSo.length ? Math.round((hoSo.filter(([, ok]) => ok).length / hoSo.length) * 100) : 0;

  return (
    <Page
      title="Tổng quan CLB"
      actions={<BoLocHocKi dsNamHoc={dsNamHoc} namHoc={namHoc} hocKi={hocKi} onNamHoc={setNamHoc} onHocKi={setHocKi} />}
    >
      {/* Thẻ CLB + thao tác nhanh */}
      {clb && (
        <section className="bg-galaxy mb-5 overflow-hidden rounded-3xl text-white">
          <div className="galaxy-stars" aria-hidden />
          <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <ClubLogo club={clb} size={64} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl sm:text-2xl">{clb.TenCLB}</h2>
              <p className="mt-1 text-sm font-semibold text-white/75">
                {[clb.DonViTrucThuoc, NHAN_TRANG_THAI_HOAT_DONG[clb.TrangThaiHoatDong]]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                <Link to="/clb/dang-bai">
                  <Plus className="h-4 w-4" /> Đăng bài mới
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white">
                <Link to="/cau-lac-bo/$id" params={{ id: String(clb.MaCLB) }} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Xem trang CLB
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI icon={Users} nhan="Người theo dõi" so={theoDoi.length} phu={`+${theoDoiMoi} mới · ${NHAN_HOC_KI[hocKi]}`} />
        <KPI
          icon={Eye}
          nhan="Lượt xem bài"
          so={tuongTac === null ? "—" : xemKy.toLocaleString("vi-VN")}
          phu={tuongTac === null ? "Chưa tải được số liệu" : tenKy}
        />
        <KPI
          icon={Heart}
          nhan="Lượt yêu thích sự kiện"
          so={tuongTac === null ? "—" : yeuThichKy.toLocaleString("vi-VN")}
          phu={
            tuongTac === null
              ? "Chưa tải được số liệu"
              : `${NHAN_HOC_KI[hocKi]} · tổng ${yeuThichTong.toLocaleString("vi-VN")} lượt`
          }
        />
        <KPI icon={FileText} nhan="Tin bài được duyệt" so={tinBaiKy.length} phu={tenKy} />
        <KPI icon={CalendarDays} nhan="Sự kiện được duyệt" so={suKienKy.length} phu={`${sapToi.length ? "Có" : "Chưa có"} sự kiện sắp diễn ra`} />
        <KPI
          icon={CheckCircle2}
          nhan="Tỉ lệ được duyệt"
          so={tiLe === null ? "—" : `${tiLe}%`}
          phu={daXuLy.length ? `${daXuLy.length} bài đã xử lý trong kỳ` : "Chưa có bài được xử lý"}
        />
        <KPI
          icon={Hourglass}
          nhan="Đang chờ duyệt"
          so={choDuyet.length + yeuCauCho}
          phu={`${choDuyet.length} bài · ${yeuCauCho} yêu cầu cập nhật`}
          noiBat={choDuyet.length + yeuCauCho > 0}
          to="/clb/bai-dang"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Khung tieuDe="Người theo dõi mới theo tháng" phu={tenKy}>
          <BieuDoCot data={duLieuTheoDoi} chuoi={[["Người theo dõi mới", MAU.tinBai]]} />
        </Khung>
        <Khung tieuDe="Nội dung được duyệt theo tháng" phu={tenKy}>
          <div className="mb-2 flex gap-4 text-xs font-bold text-muted-foreground">
            <ChuThich mau={MAU.tinBai} ten="Tin bài" />
            <ChuThich mau={MAU.suKien} ten="Sự kiện" />
          </div>
          <BieuDoCot
            data={duLieuBai}
            chuoi={[
              ["Tin bài", MAU.tinBai],
              ["Sự kiện", MAU.suKien],
            ]}
          />
        </Khung>
      </div>

      {/* Bài được quan tâm nhất trong kỳ */}
      <div className="mt-5">
        <Khung tieuDe="Bài được quan tâm nhất" phu={`${tenKy} · xếp theo lượt xem và lượt yêu thích`}>
          {tuongTac === null ? (
            <p className="text-sm text-muted-foreground">Chưa tải được số liệu tương tác. Tải lại trang để thử lại.</p>
          ) : topQuanTam.length ? (
            <ol className="divide-y">
              {topQuanTam.map((b, i) => {
                const d = diemKy.get(b.MaBaiDang)!;
                const yt = ttKy.filter((r) => r.MaBaiDang === b.MaBaiDang).reduce((a, r) => a + r.LuotYeuThich, 0);
                return (
                  <li key={b.MaBaiDang} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <span className="w-5 text-center text-sm font-extrabold text-muted-foreground">{i + 1}</span>
                    <Link
                      to="/bai-viet/$id"
                      params={{ id: String(b.MaBaiDang) }}
                      className="line-clamp-1 min-w-0 flex-1 text-sm font-bold hover:text-primary hover:underline"
                    >
                      {b.TieuDe}
                    </Link>
                    <span className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                      <span className="inline-flex items-center gap-1" title="Lượt xem">
                        <Eye className="h-3.5 w-3.5" /> {d.xem}
                      </span>
                      {b.LoaiBaiDang === "SuKien" && (
                        <span className="inline-flex items-center gap-1" title="Lượt yêu thích">
                          <Heart className="h-3.5 w-3.5" /> {yt}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có lượt xem hay lượt yêu thích nào trong kỳ này. Số liệu sẽ xuất hiện khi sinh viên mở bài của CLB.
            </p>
          )}
        </Khung>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Kiểm duyệt */}
        <Khung tieuDe="Tình trạng kiểm duyệt" phu={tenKy}>
          <ul className="space-y-2">
            {(
              [
                ["Đã duyệt", demTT("DaDuyet"), CheckCircle2, "text-success"],
                ["Chờ duyệt", demTT("ChoDuyet"), Hourglass, "text-warning-foreground"],
                ["Bị từ chối", demTT("TuChoi"), XCircle, "text-destructive"],
              ] as const
            ).map(([nhan, so, Icon, mau]) => (
              <li key={nhan} className="flex items-center gap-3 rounded-xl border p-2.5">
                <Icon className={cn("h-5 w-5", mau)} />
                <span className="flex-1 text-sm font-bold">{nhan}</span>
                <span className="text-lg font-extrabold text-primary">{so}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            {choTB === null
              ? "Chưa có dữ liệu thời gian duyệt."
              : `Thời gian chờ duyệt trung bình: ${choTB < 24 ? `${Math.max(1, Math.round(choTB))} giờ` : `${Math.round(choTB / 24)} ngày`}`}
          </p>
          {tuChoiGanDay.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> Bị từ chối gần đây
              </div>
              <ul className="space-y-2">
                {tuChoiGanDay.map(({ b, k }) => (
                  <li key={b.MaBaiDang} className="text-sm">
                    <span className="line-clamp-1 font-bold">{b.TieuDe}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">Lý do: {k?.LyDoTuChoi || "không ghi nhận"}</span>
                  </li>
                ))}
              </ul>
              <Link to="/clb/bai-dang" className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
                Sửa & gửi lại →
              </Link>
            </div>
          )}
        </Khung>

        {/* Sự kiện sắp tới */}
        <Khung tieuDe="Sự kiện sắp diễn ra" phu="Các sự kiện đã được duyệt">
          {sapToi.length ? (
            <ul className="space-y-3">
              {sapToi.map((b) => (
                <li key={b.MaBaiDang}>
                  <Link
                    to="/bai-viet/$id"
                    params={{ id: String(b.MaBaiDang) }}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border p-3 transition hover:border-primary"
                  >
                    <span className="line-clamp-2 text-sm font-bold">{b.TieuDe}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {formatKhoangThoiGian(b.su_kien!.ThoiGianBatDau, b.su_kien!.ThoiGianKetThuc)}
                      {tuongTac !== null && (
                        <span className="ml-auto inline-flex items-center gap-1 text-accent-foreground">
                          <Heart className="h-3.5 w-3.5 fill-accent text-accent" />
                          {yeuThichTheoBai.get(b.MaBaiDang) ?? 0}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">
              Chưa có sự kiện sắp diễn ra.{" "}
              <Link to="/clb/dang-bai" className="font-bold text-primary hover:underline">
                Đăng sự kiện mới
              </Link>
            </div>
          )}
          {topYeuThich.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                Được yêu thích nhiều nhất
              </div>
              <ol className="space-y-1.5">
                {topYeuThich.map((b, i) => (
                  <li key={b.MaBaiDang} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-center text-xs font-extrabold text-muted-foreground">{i + 1}</span>
                    <span className="line-clamp-1 flex-1 font-semibold">{b.TieuDe}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold">
                      <Heart className="h-3.5 w-3.5 fill-accent text-accent" />
                      {yeuThichTheoBai.get(b.MaBaiDang)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {choDuyet.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              Bài gửi gần nhất đang chờ duyệt: “{choDuyet.sort((a, b) => b.NgayTao.localeCompare(a.NgayTao))[0]!.TieuDe}” (
              {formatDateTime(choDuyet[0]!.NgayTao)})
            </p>
          )}
        </Khung>

        {/* Hồ sơ CLB */}
        <Khung tieuDe="Mức độ hoàn thiện hồ sơ CLB" phu="Hồ sơ đầy đủ giúp sinh viên tìm và tin tưởng CLB hơn">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-primary">{phanTram}%</span>
            <span className="text-xs font-bold text-muted-foreground">
              {hoSo.filter(([, ok]) => ok).length}/{hoSo.length} mục
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${phanTram}%` }} />
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-semibold">
            {hoSo.map(([ten, ok]) => (
              <li key={ten} className={cn("flex items-center gap-1.5", ok ? "text-muted-foreground" : "text-foreground")}>
                {ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
                )}
                {ten}
              </li>
            ))}
          </ul>
          {phanTram < 100 && (
            <Button asChild size="sm" variant="outline" className="mt-4 w-full font-bold">
              <Link to="/clb/thong-tin">
                <Settings className="h-4 w-4" /> Bổ sung thông tin CLB
              </Link>
            </Button>
          )}
          <Link to="/clb/yeu-cau" className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:underline">
            <ClipboardList className="h-3.5 w-3.5" /> Xem yêu cầu cập nhật đã gửi
          </Link>
        </Khung>
      </div>
    </Page>
  );
}

function BieuDoCot({ data, chuoi }: { data: Record<string, string | number>[]; chuoi: [string, string][] }) {
  return (
    <div className="h-56" role="img" aria-label={`Biểu đồ cột: ${chuoi.map(([t]) => t).join(", ")} theo tháng`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="ten" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            cursor={{ fill: "rgb(41 45 120 / 0.06)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 13 }}
          />
          {chuoi.map(([ten, mau]) => (
            <Bar key={ten} dataKey={ten} fill={mau} radius={[4, 4, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function KPI({
  icon: Icon,
  nhan,
  so,
  phu,
  noiBat = false,
  to,
}: {
  icon: LucideIcon;
  nhan: string;
  so: number | string;
  phu: string;
  noiBat?: boolean;
  to?: "/clb/bai-dang";
}) {
  const noiDung = (
    <>
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-bold", noiBat ? "text-accent-foreground" : "text-muted-foreground")}>{nhan}</span>
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg",
            noiBat ? "bg-accent text-accent-foreground" : "bg-secondary text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-3xl font-extrabold text-primary">
        {typeof so === "number" ? so.toLocaleString("vi-VN") : so}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{phu}</div>
    </>
  );
  const lop = cn(
    "rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]",
    noiBat && "border-accent bg-accent/10",
    to && "transition hover:-translate-y-0.5 hover:border-primary",
  );
  return to ? (
    <Link to={to} className={lop}>
      {noiDung}
    </Link>
  ) : (
    <div className={lop}>{noiDung}</div>
  );
}

function Khung({ tieuDe, phu, children }: { tieuDe: string; phu: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-base">{tieuDe}</h2>
      <p className="mb-4 mt-0.5 text-xs font-semibold text-muted-foreground">{phu}</p>
      {children}
    </section>
  );
}

function ChuThich({ mau, ten }: { mau: string; ten: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: mau }} />
      {ten}
    </span>
  );
}
