import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ClubLogo,
  ConfirmDialog,
  Empty,
  GridSkeleton,
  LoaiBaiDangBadge,
  LoaiSuKienBadge,
  Page,
  RoleGate,
  TrangThaiKiemDuyetBadge,
  TrangThaiXuLyBadge,
} from "@/components/common";
import { BangThayDoi } from "@/components/yeu-cau";
import { NoiDungBaiViet } from "@/components/NoiDungBaiViet";
import { vanBanThuan } from "@/lib/noi-dung";
import { useViecChoXuLy } from "@/components/admin/AdminLayout";
import {
  formatDateTime,
  formatKhoangThoiGian,
  type BaiDang,
  type LuotKiemDuyet,
  type TrangThaiKiemDuyet,
  type YeuCauCapNhat,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TAB = ["bai-dang", "su-kien", "thong-tin"] as const;
type Tab = (typeof TAB)[number];

const search = z.object({
  tab: z.enum(TAB).optional(),
  trang_thai: z.enum(["ChoDuyet", "DaDuyet", "TuChoi"]).optional(),
});

export const Route = createFileRoute("/admin/kiem-duyet")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Kiểm duyệt – Quản trị BAV CLUBS" },
      {
        name: "description",
        content: "Kiểm duyệt bài đăng, sự kiện và yêu cầu thay đổi thông tin do các CLB gửi lên.",
      },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <KiemDuyet />
    </RoleGate>
  ),
});

const THE_TAB: { id: Tab; ten: string; moTa: string; icon: LucideIcon }[] = [
  { id: "bai-dang", ten: "Duyệt bài đăng", moTa: "Tin tức, chương trình, thành tích, thông báo CLB", icon: FileText },
  { id: "su-kien", ten: "Duyệt sự kiện", moTa: "Sự kiện học thuật và phi học thuật", icon: CalendarDays },
  { id: "thong-tin", ten: "Duyệt thay đổi thông tin", moTa: "Yêu cầu cập nhật hồ sơ CLB", icon: ClipboardList },
];

const NHAN_TRANG_THAI: Record<TrangThaiKiemDuyet, string> = {
  ChoDuyet: "Chờ duyệt",
  DaDuyet: "Đã duyệt",
  TuChoi: "Đã từ chối",
};

/**
 * Trang Kiểm duyệt – gộp "Duyệt bài" và "Duyệt yêu cầu" cũ thành 3 tab.
 * Luồng theo PTTKHT (Bảng 4 bước 5–12 và kịch bản "Duyệt bài đăng"):
 * xem chi tiết -> Duyệt (có hộp xác nhận Có/Hủy) hoặc Từ chối (bắt buộc nhập lý do) -> hệ thống
 * cập nhật trạng thái, ghi bảng kiem_duyet và gửi thông báo cho CLB (do trigger CSDL thực hiện).
 */
function KiemDuyet() {
  const { tab = "bai-dang", trang_thai = "ChoDuyet" } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/kiem-duyet" });
  const { data: viecCho } = useViecChoXuLy();
  const soCho: Record<Tab, number> = {
    "bai-dang": viecCho?.baiDang ?? 0,
    "su-kien": viecCho?.suKien ?? 0,
    "thong-tin": viecCho?.thongTin ?? 0,
  };

  return (
    <Page title="Kiểm duyệt">
      {/* 3 tab chính */}
      <div className="grid gap-3 sm:grid-cols-3">
        {THE_TAB.map((t) => {
          const chon = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => navigate({ search: { tab: t.id, trang_thai } })}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                chon
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_30px_-14px_rgb(41_45_120/0.8)]"
                  : "bg-card hover:border-primary",
              )}
            >
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                  chon ? "bg-white/15" : "bg-secondary text-primary",
                )}
              >
                <t.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{t.ten}</span>
                <span className={cn("block truncate text-xs font-semibold", chon ? "text-white/70" : "text-muted-foreground")}>
                  {t.moTa}
                </span>
              </span>
              {soCho[t.id] > 0 && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-extrabold text-accent-foreground">
                  {soCho[t.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lọc trạng thái – lịch sử kiểm duyệt (bảng kiem_duyet / yeu_cau_cap_nhat) */}
      <div className="mb-5 mt-5 flex flex-wrap gap-2">
        {(Object.keys(NHAN_TRANG_THAI) as TrangThaiKiemDuyet[]).map((s) => (
          <button
            key={s}
            onClick={() => navigate({ search: { tab, trang_thai: s } })}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-bold transition",
              s === trang_thai ? "border-primary bg-secondary text-primary" : "bg-card text-muted-foreground hover:text-primary",
            )}
          >
            {NHAN_TRANG_THAI[s]}
          </button>
        ))}
      </div>

      {tab === "thong-tin" ? (
        <DuyetThongTin trangThai={trang_thai} />
      ) : (
        <DuyetBai suKien={tab === "su-kien"} trangThai={trang_thai} />
      )}
    </Page>
  );
}

type BaiCanDuyet = BaiDang & { kiem_duyet?: LuotKiemDuyet[] | null };

/* ------------------------------ Bài đăng / Sự kiện ------------------------------ */
function DuyetBai({ suKien, trangThai }: { suKien: boolean; trangThai: TrangThaiKiemDuyet }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["kiem-duyet-bai", suKien, trangThai],
    queryFn: async () => {
      let query = supabase
        .from("bai_dang")
        .select(
          "*, cau_lac_bo(MaCLB, TenCLB, LogoCLB), su_kien(*), kiem_duyet(KetQuaKiemDuyet, LyDoTuChoi, ThoiGianKiemDuyet)",
        )
        .eq("TrangThaiKiemDuyet", trangThai)
        .order("NgayTao", { ascending: trangThai === "ChoDuyet" })
        .limit(50);
      query = suKien ? query.eq("LoaiBaiDang", "SuKien") : query.neq("LoaiBaiDang", "SuKien");
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BaiCanDuyet[];
    },
  });

  const [duyet, setDuyet] = useState<BaiCanDuyet | null>(null);
  const [tuChoi, setTuChoi] = useState<BaiCanDuyet | null>(null);
  const [lyDo, setLyDo] = useState("");

  const lamMoi = () => {
    qc.invalidateQueries({ queryKey: ["kiem-duyet-bai"] });
    qc.invalidateQueries({ queryKey: ["admin-viec-cho"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const xacNhanDuyet = async (p: BaiCanDuyet) => {
    const { error } = await supabase
      .from("bai_dang")
      .update({ TrangThaiKiemDuyet: "DaDuyet" })
      .eq("MaBaiDang", p.MaBaiDang);
    if (error) {
      toast.error("Thao tác thất bại: " + error.message);
      return;
    }
    toast.success(suKien ? "Đã duyệt sự kiện" : "Đã duyệt bài đăng");
    lamMoi();
  };

  // Từ chối đi qua hàm tu_choi_bai_dang() để lý do được ghi vào bảng kiem_duyet
  const xacNhanTuChoi = async (p: BaiCanDuyet, ly: string) => {
    const { error } = await supabase.rpc("tu_choi_bai_dang", { _ma_bai_dang: p.MaBaiDang, _ly_do: ly });
    if (error) {
      toast.error("Thao tác thất bại: " + error.message);
      return;
    }
    toast.success("Đã từ chối và gửi lý do cho CLB");
    lamMoi();
  };

  const ten = suKien ? "sự kiện" : "bài đăng";

  if (q.isLoading) return <GridSkeleton n={3} />;
  if (!q.data?.length)
    return (
      <Empty
        text={
          trangThai === "ChoDuyet"
            ? `Không có ${ten} nào đang chờ duyệt 🎉`
            : `Chưa có ${ten} nào ${NHAN_TRANG_THAI[trangThai].toLowerCase()}`
        }
      />
    );

  return (
    <>
      <div className="space-y-3">
        {q.data.map((p) => (
          <TheBai
            key={p.MaBaiDang}
            p={p}
            onDuyet={() => setDuyet(p)}
            onTuChoi={() => {
              setLyDo("");
              setTuChoi(p);
            }}
          />
        ))}
      </div>

      <ConfirmDialog
        open={!!duyet}
        onOpenChange={(o) => !o && setDuyet(null)}
        title={`Duyệt ${ten} này?`}
        description={`${suKien ? "Sự kiện" : "Bài"} sẽ được công khai; CLB và những người đang theo dõi CLB nhận được thông báo.`}
        confirmText="Có, duyệt"
        onConfirm={() => duyet && xacNhanDuyet(duyet)}
      />

      <Dialog open={!!tuChoi} onOpenChange={(o) => !o && setTuChoi(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối {ten}</DialogTitle>
          </DialogHeader>
          <p className="line-clamp-2 text-sm font-semibold text-muted-foreground">“{tuChoi?.TieuDe}”</p>
          <Textarea
            rows={4}
            maxLength={1000}
            placeholder="Nhập lý do từ chối (bắt buộc) – CLB sẽ nhận được lý do này"
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTuChoi(null)}>
              Hủy
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (!lyDo.trim()) {
                  toast.error("Vui lòng nhập lý do từ chối");
                  return;
                }
                const p = tuChoi!;
                setTuChoi(null);
                xacNhanTuChoi(p, lyDo.trim());
              }}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TheBai({ p, onDuyet, onTuChoi }: { p: BaiCanDuyet; onDuyet: () => void; onTuChoi: () => void }) {
  const [moRong, setMoRong] = useState(false);
  const luotCuoi = [...(p.kiem_duyet ?? [])].sort((a, b) =>
    b.ThoiGianKiemDuyet.localeCompare(a.ThoiGianKiemDuyet),
  )[0];

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        {p.AnhBia && (
          <img
            src={p.AnhBia}
            alt=""
            className={cn(
              "w-full shrink-0 rounded-xl border object-cover sm:w-44",
              moRong ? "sm:h-auto" : "h-40 sm:h-28",
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {p.cau_lac_bo && <ClubLogo club={p.cau_lac_bo} size={24} />}
            <span className="font-bold text-primary">{p.cau_lac_bo?.TenCLB}</span>
            <LoaiBaiDangBadge loai={p.LoaiBaiDang} />
            {p.su_kien && <LoaiSuKienBadge loai={p.su_kien.LoaiSuKien} />}
            <span className="text-xs font-semibold text-muted-foreground">gửi {formatDateTime(p.NgayTao)}</span>
          </div>
          <h3 className="mt-2 text-lg font-bold leading-snug">{p.TieuDe}</h3>
          {p.su_kien && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                {formatKhoangThoiGian(p.su_kien.ThoiGianBatDau, p.su_kien.ThoiGianKetThuc)}
              </span>
              {p.su_kien.DiaDiem && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {p.su_kien.DiaDiem}
                </span>
              )}
            </div>
          )}
          {moRong ? (
            <NoiDungBaiViet noiDung={p.NoiDung} className="mt-3 rounded-xl border bg-background p-4 text-sm" />
          ) : (
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-foreground/85">{vanBanThuan(p.NoiDung)}</p>
          )}
          <button
            onClick={() => setMoRong((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            {moRong ? (
              <>
                Thu gọn <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Xem chi tiết <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <TrangThaiKiemDuyetBadge trangThai={p.TrangThaiKiemDuyet} />
          {luotCuoi && p.TrangThaiKiemDuyet !== "ChoDuyet" && (
            <span className="text-xs font-semibold text-muted-foreground">
              lúc {formatDateTime(luotCuoi.ThoiGianKiemDuyet)}
            </span>
          )}
          {p.TrangThaiKiemDuyet === "TuChoi" && luotCuoi?.LyDoTuChoi && (
            <span className="font-semibold text-destructive">Lý do: {luotCuoi.LyDoTuChoi}</span>
          )}
        </div>
        {p.TrangThaiKiemDuyet === "ChoDuyet" && (
          <div className="flex gap-2">
            <Button variant="outline" className="border-destructive text-destructive" onClick={onTuChoi}>
              Từ chối
            </Button>
            <Button className="bg-success font-bold text-success-foreground hover:bg-success/90" onClick={onDuyet}>
              Duyệt
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

/* ------------------------------ Thay đổi thông tin CLB ------------------------------ */
type YeuCauKemCLB = Omit<YeuCauCapNhat, "cau_lac_bo"> & {
  cau_lac_bo?: (Record<string, unknown> & { TenCLB: string; LogoCLB: string | null }) | null;
};

function DuyetThongTin({ trangThai }: { trangThai: TrangThaiKiemDuyet }) {
  const qc = useQueryClient();
  const [duyet, setDuyet] = useState<YeuCauKemCLB | null>(null);
  const [tuChoi, setTuChoi] = useState<YeuCauKemCLB | null>(null);
  const [lyDo, setLyDo] = useState("");

  const q = useQuery({
    queryKey: ["kiem-duyet-thong-tin", trangThai],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yeu_cau_cap_nhat")
        .select("*, cau_lac_bo(*)")
        .eq("TrangThaiXuLy", trangThai)
        .order("ThoiGianGui", { ascending: trangThai === "ChoDuyet" })
        .limit(50);
      if (error) throw error;
      return data as unknown as YeuCauKemCLB[];
    },
  });

  const xuLy = async (yc: YeuCauKemCLB, kq: "DaDuyet" | "TuChoi", ly: string | null) => {
    const { error } = await supabase
      .from("yeu_cau_cap_nhat")
      .update({ TrangThaiXuLy: kq, LyDoTuChoi: ly })
      .eq("MaYeuCau", yc.MaYeuCau);
    if (error) {
      toast.error("Thao tác thất bại: " + error.message);
      return;
    }
    toast.success(kq === "DaDuyet" ? "Đã duyệt và áp dụng thay đổi" : "Đã từ chối yêu cầu");
    qc.invalidateQueries({ queryKey: ["kiem-duyet-thong-tin"] });
    qc.invalidateQueries({ queryKey: ["admin-viec-cho"] });
    qc.invalidateQueries({ queryKey: ["cau_lac_bo"] });
  };

  if (q.isLoading) return <GridSkeleton n={2} />;
  if (!q.data?.length)
    return (
      <Empty
        text={
          trangThai === "ChoDuyet"
            ? "Không có yêu cầu thay đổi thông tin nào đang chờ duyệt 🎉"
            : "Không có yêu cầu nào trong mục này"
        }
      />
    );

  return (
    <>
      <div className="space-y-3">
        {q.data.map((yc) => (
          <article key={yc.MaYeuCau} className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {yc.cau_lac_bo && <ClubLogo club={yc.cau_lac_bo} size={28} />}
                <span className="font-bold text-primary">{yc.cau_lac_bo?.TenCLB}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  gửi {formatDateTime(yc.ThoiGianGui)}
                </span>
              </div>
              <div className="mt-3">
                <BangThayDoi
                  noiDung={yc.NoiDungThayDoi}
                 
                  hienTai={trangThai === "ChoDuyet" ? yc.cau_lac_bo : null}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <TrangThaiXuLyBadge trangThai={yc.TrangThaiXuLy} />
                {yc.ThoiGianXuLy && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    lúc {formatDateTime(yc.ThoiGianXuLy)}
                  </span>
                )}
                {yc.TrangThaiXuLy === "TuChoi" && yc.LyDoTuChoi && (
                  <span className="font-semibold text-destructive">Lý do: {yc.LyDoTuChoi}</span>
                )}
              </div>
              {yc.TrangThaiXuLy === "ChoDuyet" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive"
                    onClick={() => {
                      setLyDo("");
                      setTuChoi(yc);
                    }}
                  >
                    Từ chối
                  </Button>
                  <Button
                    className="bg-success font-bold text-success-foreground hover:bg-success/90"
                    onClick={() => setDuyet(yc)}
                  >
                    Duyệt & áp dụng
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={!!duyet}
        onOpenChange={(o) => !o && setDuyet(null)}
        title="Duyệt yêu cầu thay đổi thông tin?"
        description="Các thay đổi sẽ được ghi vào hồ sơ CLB và CLB nhận được thông báo."
        confirmText="Có, duyệt & áp dụng"
        onConfirm={() => duyet && xuLy(duyet, "DaDuyet", null)}
      />

      <Dialog open={!!tuChoi} onOpenChange={(o) => !o && setTuChoi(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu – {tuChoi?.cau_lac_bo?.TenCLB}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={1000}
            placeholder="Nhập lý do từ chối (bắt buộc) – CLB sẽ nhận được lý do này"
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTuChoi(null)}>
              Hủy
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (!lyDo.trim()) {
                  toast.error("Vui lòng nhập lý do từ chối");
                  return;
                }
                const yc = tuChoi!;
                setTuChoi(null);
                xuLy(yc, "TuChoi", lyDo.trim());
              }}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
