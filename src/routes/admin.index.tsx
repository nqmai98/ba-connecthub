import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Eye,
  FileText,
  TrendingUp,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo, GridSkeleton, Page, RoleGate } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useViecChoXuLy } from "@/components/admin/AdminLayout";
import { NHAN_KHOI, useCauLacBo, type KhoiToChuc } from "@/lib/data";
import { maNhomCuaCLB, useSoDoToChuc } from "@/lib/so-do-to-chuc";
import { cn } from "@/lib/utils";
import { danhSachNamHoc, khoangHocKi, namHocCua, NHAN_HOC_KI, type HocKi } from "@/lib/hoc-ki";
import { BoLocHocKi } from "@/components/BoLocHocKi";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard – Quản trị BAV CLUBS" },
      { name: "description", content: "Thống kê tổng quan hệ thống BAV CLUBS." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <Dashboard />
    </RoleGate>
  ),
});

/** Màu 2 chuỗi dữ liệu – họ xanh navy / vàng của thương hiệu, đã kiểm tra tương phản & mù màu. */
const MAU = { tinBai: "#4152b8", suKien: "#c98208" };
const NGAY = 24 * 60 * 60 * 1000;

type BaiTK = {
  MaBaiDang: number;
  MaCLB: number;
  LoaiBaiDang: string;
  TrangThaiKiemDuyet: string;
  NgayTao: string;
};



/**
 * Dashboard Quản trị – theo PTTKHT (câu hỏi 11, 15 và Hình 13): số CLB, số bài viết, số sự kiện,
 * lượt truy cập; theo dõi mức độ hoạt động của từng đơn vị.
 * Thay biểu đồ "số bài theo từng CLB" (không đọc được khi có hàng chục CLB) bằng:
 *  - xu hướng bài đăng theo tháng,
 *  - hoạt động gộp theo đơn vị trong sơ đồ tổ chức Đoàn – Hội,
 *  - Top CLB tích cực và số CLB "im lặng" cần hỗ trợ.
 */
function Dashboard() {
  const { data: clubs } = useCauLacBo();
  const { data: dsNhom } = useSoDoToChuc();
  const { data: viecCho } = useViecChoXuLy();
  const [namHoc, setNamHoc] = useState(() => namHocCua(new Date()));
  const [hocKi, setHocKi] = useState<HocKi>("ca-nam");
  const [xemTop, setXemTop] = useState(false);

  const q = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [posts, suKien, theoDoi, nguoiDung, stats] = await Promise.all([
        supabase.from("bai_dang").select("MaBaiDang, MaCLB, LoaiBaiDang, TrangThaiKiemDuyet, NgayTao"),
        supabase.from("su_kien").select("MaBaiDang, ThoiGianBatDau, ThoiGianKetThuc"),
        supabase.from("theo_doi_clb").select("MaCLB"),
        supabase.from("nguoi_dung").select("TrangThaiTaiKhoan, vai_tro(TenVaiTro)"),
        supabase.from("thong_ke_truy_cap").select("LuotTruyCap").maybeSingle(),
      ]);
      return {
        posts: (posts.data ?? []) as BaiTK[],
        suKien: (suKien.data ?? []) as { MaBaiDang: number; ThoiGianBatDau: string; ThoiGianKetThuc: string }[],
        theoDoi: (theoDoi.data ?? []) as { MaCLB: number }[],
        nguoiDung: (nguoiDung.data ?? []) as unknown as {
          TrangThaiTaiKhoan: string;
          vai_tro: { TenVaiTro: string } | null;
        }[],
        luotTruyCap: stats.data?.LuotTruyCap ?? 0,
      };
    },
  });

  const dsNamHoc = useMemo(() => danhSachNamHoc((q.data?.posts ?? []).map((p) => p.NgayTao)), [q.data]);

  if (q.isLoading || !clubs)
    return (
      <Page title="Dashboard">
        <GridSkeleton n={4} />
      </Page>
    );
  const d = q.data ?? { posts: [], suKien: [], theoDoi: [], nguoiDung: [], luotTruyCap: 0 };
  const now = Date.now();
  const [tu, den] = khoangHocKi(namHoc, hocKi);
  const tenKy = `${NHAN_HOC_KI[hocKi]} · ${namHoc}–${namHoc + 1}`;
  const batDauSK = new Map(d.suKien.map((x) => [x.MaBaiDang, x.ThoiGianBatDau]));
  // Bài viết tính theo ngày gửi; sự kiện tính theo ngày diễn ra
  const thoiDiem = (p: BaiTK) => new Date(p.LoaiBaiDang === "SuKien" ? (batDauSK.get(p.MaBaiDang) ?? p.NgayTao) : p.NgayTao);
  const trongKy = (p: BaiTK) => {
    const t = thoiDiem(p);
    return t >= tu && t < den;
  };
  const daDuyetTatCa = d.posts.filter((p) => p.TrangThaiKiemDuyet === "DaDuyet");
  const daDuyet = daDuyetTatCa.filter(trongKy);
  const gan30 = (p: BaiTK) => now - new Date(p.NgayTao).getTime() <= 30 * NGAY;
  const tinBai = daDuyet.filter((p) => p.LoaiBaiDang !== "SuKien");
  const suKien = daDuyet.filter((p) => p.LoaiBaiDang === "SuKien");
  const suKienSapToi = d.suKien.filter((x) => new Date(x.ThoiGianKetThuc).getTime() >= now).length;
  const clbHoatDong = clubs.filter((c) => c.TrangThaiHoatDong === "DangHoatDong").length;

  // ---- Xu hướng theo từng tháng trong kỳ đã chọn ----
  const thang: { y: number; m: number }[] = [];
  for (let t = new Date(tu); t < den; t = new Date(t.getFullYear(), t.getMonth() + 1, 1))
    thang.push({ y: t.getFullYear(), m: t.getMonth() });
  const xuHuong = thang.map(({ y, m }) => {
    const trong = daDuyet.filter((p) => {
      const t = thoiDiem(p);
      return t.getFullYear() === y && t.getMonth() === m;
    });
    return {
      ten: `T${m + 1}/${String(y).slice(2)}`,
      "Tin bài": trong.filter((p) => p.LoaiBaiDang !== "SuKien").length,
      "Sự kiện": trong.filter((p) => p.LoaiBaiDang === "SuKien").length,
    };
  });

  // ---- Theo đơn vị trong sơ đồ tổ chức ----
  const clbKemNhom = clubs.map((c) => ({ ...c, MaNhom: maNhomCuaCLB(c, dsNhom) }));
  // Số bài viết / sự kiện được duyệt trong kỳ của từng CLB
  const baiTheoCLB = new Map<number, number>();
  const skTheoCLB = new Map<number, number>();
  tinBai.forEach((p) => baiTheoCLB.set(p.MaCLB, (baiTheoCLB.get(p.MaCLB) ?? 0) + 1));
  suKien.forEach((p) => skTheoCLB.set(p.MaCLB, (skTheoCLB.get(p.MaCLB) ?? 0) + 1));
  const tongTheoCLB = (ma: number) => (baiTheoCLB.get(ma) ?? 0) + (skTheoCLB.get(ma) ?? 0);
  const baiGanDayTheoCLB = new Map<number, number>();
  daDuyetTatCa.filter(gan30).forEach((p) => baiGanDayTheoCLB.set(p.MaCLB, (baiGanDayTheoCLB.get(p.MaCLB) ?? 0) + 1));
  const theoDoiTheoCLB = new Map<number, number>();
  d.theoDoi.forEach((t) => theoDoiTheoCLB.set(t.MaCLB, (theoDoiTheoCLB.get(t.MaCLB) ?? 0) + 1));

  const donVi = dsNhom.map((n) => {
    const cl = clbKemNhom.filter((c) => c.MaNhom === n.MaNhom);
    return {
      ...n,
      soCLB: cl.length,
      baiGanDay: cl.reduce((s, c) => s + tongTheoCLB(c.MaCLB), 0),
    };
  });
  const chuaPhanLoai = clbKemNhom.filter((c) => c.MaNhom == null);
  const maxBai = Math.max(1, ...donVi.map((x) => x.baiGanDay));

  // ---- Top CLB & CLB im lặng ----
  // Xếp hạng: tổng bài viết + sự kiện được duyệt trong kỳ, hòa thì xét số người theo dõi
  const xepHang = clubs
    .map((c) => ({
      c,
      bai: baiTheoCLB.get(c.MaCLB) ?? 0,
      suKien: skTheoCLB.get(c.MaCLB) ?? 0,
      theoDoi: theoDoiTheoCLB.get(c.MaCLB) ?? 0,
    }))
    .filter((x) => x.bai + x.suKien > 0)
    .sort((a, b) => b.bai + b.suKien - (a.bai + a.suKien) || b.theoDoi - a.theoDoi);
  const top = xepHang.slice(0, 5);
  const top15 = xepHang.slice(0, 15);
  const imLang = clubs.filter(
    (c) => c.TrangThaiHoatDong === "DangHoatDong" && !baiGanDayTheoCLB.get(c.MaCLB),
  ).length;

  // ---- Người dùng ----
  const demVaiTro = (v: string) => d.nguoiDung.filter((u) => u.vai_tro?.TenVaiTro === v).length;
  const biKhoa = d.nguoiDung.filter((u) => u.TrangThaiTaiKhoan === "BiKhoa").length;

  return (
    <Page
      title="Dashboard"
      subtitle="Tổng quan hoạt động của các câu lạc bộ trên BAV CLUBS"
      actions={
        <BoLocHocKi dsNamHoc={dsNamHoc} namHoc={namHoc} hocKi={hocKi} onNamHoc={setNamHoc} onHocKi={setHocKi} />
      }
    >
      {/* KPI theo PTTKHT: CLB – Bài viết – Sự kiện – Chờ duyệt – Lượt truy cập */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPI icon={UsersRound} nhan="Câu lạc bộ" so={clubs.length} phu={`${clbHoatDong} đang hoạt động`} />
        <KPI icon={FileText} nhan="Bài viết" so={tinBai.length} phu={tenKy} />
        <KPI icon={CalendarDays} nhan="Sự kiện" so={suKien.length} phu={`${tenKy} · ${suKienSapToi} sắp diễn ra`} />
        <KPI
          icon={ClipboardCheck}
          nhan="Chờ duyệt"
          so={viecCho?.tong ?? 0}
          phu="Xem trang Kiểm duyệt"
          to="/admin/kiem-duyet"
          noiBat={(viecCho?.tong ?? 0) > 0}
        />
        <KPI icon={Eye} nhan="Lượt truy cập" so={d.luotTruyCap} phu="Tổng từ khi ra mắt" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Xu hướng bài đăng */}
        <Khung tieuDe="Nội dung được duyệt theo tháng" phu={tenKy} className="lg:col-span-2">
          <div className="mb-2 flex gap-4 text-xs font-bold text-muted-foreground">
            <ChuThich mau={MAU.tinBai} ten="Tin bài" />
            <ChuThich mau={MAU.suKien} ten="Sự kiện" />
          </div>
          <div className="h-64" role="img" aria-label={`Biểu đồ cột số tin bài và sự kiện được duyệt theo tháng, ${tenKy}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={xuHuong} barGap={2} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="ten" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: "rgb(41 45 120 / 0.06)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 13 }}
                />
                <Bar dataKey="Tin bài" fill={MAU.tinBai} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Sự kiện" fill={MAU.suKien} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Khung>

        {/* Việc cần xử lý */}
        <Khung tieuDe="Việc cần xử lý" phu="Nội dung CLB gửi lên đang chờ bạn">
          <ul className="space-y-2">
            {(
              [
                ["bai-dang", "Bài đăng chờ duyệt", viecCho?.baiDang ?? 0, FileText],
                ["su-kien", "Sự kiện chờ duyệt", viecCho?.suKien ?? 0, CalendarDays],
                ["thong-tin", "Yêu cầu đổi thông tin", viecCho?.thongTin ?? 0, ClipboardCheck],
              ] as const
            ).map(([tab, nhan, so, Icon]) => (
              <li key={tab}>
                <Link
                  to="/admin/kiem-duyet"
                  search={{ tab }}
                  className="flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary hover:bg-secondary/50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-bold">{nhan}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-sm font-extrabold",
                      so ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {so}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {imLang > 0 && (
            <Link
              to="/admin/clb"
              className="mt-3 flex items-center gap-2 rounded-xl bg-warning/15 p-3 text-sm font-semibold"
            >
              <span className="flex-1">
                <b>{imLang} CLB</b> đang hoạt động nhưng chưa có bài nào được duyệt trong 30 ngày qua
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          )}
        </Khung>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Hoạt động theo đơn vị */}
        <Khung
          tieuDe="Hoạt động theo tổ chức"
          phu={`Số CLB và số bài viết, sự kiện được duyệt · ${tenKy}`}
          className="lg:col-span-2"
        >
          <div className="grid gap-5 md:grid-cols-2">
            {(Object.keys(NHAN_KHOI) as KhoiToChuc[]).map((k) => (
              <div key={k}>
                <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-primary">{NHAN_KHOI[k]}</div>
                <ul className="space-y-2.5">
                  {donVi
                    .filter((x) => x.Khoi === k)
                    .map((x) => (
                      <li key={x.MaNhom} title={`${x.TenNhom}: ${x.soCLB} CLB, ${x.baiGanDay} bài viết và sự kiện`}>
                        <Link to="/admin/clb" search={{ khoi: k, nhom: x.MaNhom }} className="group block">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="truncate font-semibold group-hover:text-primary">{x.TenNhom}</span>
                            <span className="shrink-0 text-xs font-bold text-muted-foreground">
                              {x.soCLB} CLB · <span className="text-foreground">{x.baiGanDay} bài</span>
                            </span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all group-hover:bg-primary-dark"
                              style={{ width: `${(x.baiGanDay / maxBai) * 100}%`, minWidth: x.baiGanDay ? 6 : 0 }}
                            />
                          </div>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          {chuaPhanLoai.length > 0 && (
            <p className="mt-4 text-xs font-semibold text-muted-foreground">
              {chuaPhanLoai.length} CLB chưa được xếp vào đơn vị nào –{" "}
              <Link to="/admin/clb" search={{ khoi: "ChuaPhanLoai" }} className="font-bold text-primary hover:underline">
                xem danh sách
              </Link>
            </p>
          )}
        </Khung>

        <div className="space-y-5">
          {/* Top CLB */}
          <Khung tieuDe="CLB tích cực nhất" phu={`Theo số bài viết và sự kiện được duyệt · ${tenKy}`}>
            {top.length ? (
              <ol className="space-y-2.5">
                {top.map(({ c, bai, suKien: sk, theoDoi }, i) => (
                  <li key={c.MaCLB} className="flex items-center gap-3">
                    <span className="w-4 text-center text-sm font-extrabold text-muted-foreground">{i + 1}</span>
                    <ClubLogo club={c} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{c.TenCLB}</span>
                      <span className="block text-xs font-semibold text-muted-foreground">
                        {bai} bài viết · {sk} sự kiện · {theoDoi} người theo dõi
                      </span>
                    </span>
                    {i === 0 && <TrendingUp className="h-4 w-4 text-success" aria-label="Dẫn đầu" />}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có hoạt động trong kỳ này.</p>
            )}
            {xepHang.length > 5 && (
              <Button variant="outline" size="sm" className="mt-4 w-full font-bold" onClick={() => setXemTop(true)}>
                Xem thêm (Top {Math.min(15, xepHang.length)})
              </Button>
            )}
          </Khung>

          {/* Người dùng */}
          <Khung tieuDe="Người dùng">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Sinh viên", demVaiTro("SinhVien")],
                  ["Đại diện CLB", demVaiTro("DaiDienCLB")],
                  ["Quản trị", demVaiTro("QuanTriVien")],
                ] as const
              ).map(([n, v]) => (
                <div key={n} className="rounded-xl bg-secondary/60 p-2.5">
                  <dd className="text-xl font-extrabold text-primary">{v}</dd>
                  <dt className="text-[11px] font-bold text-muted-foreground">{n}</dt>
                </div>
              ))}
            </dl>
            <Link
              to="/admin/tai-khoan"
              className="mt-3 flex items-center justify-between text-sm font-bold text-primary hover:underline"
            >
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Quản lý tài khoản
              </span>
              {biKhoa > 0 && <span className="text-xs text-destructive">{biKhoa} tài khoản bị khóa</span>}
            </Link>
          </Khung>
        </div>
      </div>
      <Dialog open={xemTop} onOpenChange={setXemTop}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Top 15 CLB hoạt động tích cực</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm font-semibold text-muted-foreground">{tenKy}</p>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Câu lạc bộ</th>
                  <th className="p-2.5 text-right">Bài viết</th>
                  <th className="p-2.5 text-right">Sự kiện</th>
                  <th className="p-2.5 text-right">Theo dõi</th>
                </tr>
              </thead>
              <tbody>
                {top15.map(({ c, bai, suKien: sk, theoDoi }, i) => (
                  <tr key={c.MaCLB} className="border-t">
                    <td className="p-2.5 text-center font-extrabold text-muted-foreground">{i + 1}</td>
                    <td className="p-2.5">
                      <span className="flex items-center gap-2">
                        <ClubLogo club={c} size={28} />
                        <span className="font-bold">{c.TenCLB}</span>
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-semibold">{bai}</td>
                    <td className="p-2.5 text-right font-semibold">{sk}</td>
                    <td className="p-2.5 text-right font-semibold">{theoDoi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

function KPI({
  icon: Icon,
  nhan,
  so,
  phu,
  to,
  noiBat = false,
}: {
  icon: LucideIcon;
  nhan: string;
  so: number;
  phu: string;
  to?: "/admin/kiem-duyet";
  noiBat?: boolean;
}) {
  const noiDung = (
    <>
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-bold", noiBat ? "text-accent-foreground" : "text-muted-foreground")}>
          {nhan}
        </span>
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg",
            noiBat ? "bg-accent text-accent-foreground" : "bg-secondary text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-3xl font-extrabold text-primary">{so.toLocaleString("vi-VN")}</div>
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

function Khung({
  tieuDe,
  phu,
  className,
  children,
}: {
  tieuDe: string;
  phu?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]", className)}>
      <h2 className="text-base">{tieuDe}</h2>
      {phu && <p className="mb-4 mt-0.5 text-xs font-semibold text-muted-foreground">{phu}</p>}
      {!phu && <div className="mb-3" />}
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
