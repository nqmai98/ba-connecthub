import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Eye, History, Pencil, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Empty,
  GridSkeleton,
  LoaiBaiDangBadge,
  Page,
  RoleGate,
  TrangThaiKiemDuyetBadge,
} from "@/components/common";
import { PostForm } from "@/components/forms";
import { useAuth } from "@/lib/auth";
import {
  formatDateTime,
  formatKhoangThoiGian,
  type BaiDang,
  type LuotKiemDuyet,
  type TrangThaiKiemDuyet,
} from "@/lib/data";
import { vanBanThuan } from "@/lib/noi-dung";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/clb/bai-dang")({
  head: () => ({
    meta: [
      { title: "Bài đăng của tôi – BAV CLUBS" },
      {
        name: "description",
        content: "Theo dõi trạng thái và lịch sử kiểm duyệt các bài đăng của CLB.",
      },
      { property: "og:title", content: "Bài đăng của tôi – BAV CLUBS" },
      { property: "og:description", content: "Theo dõi trạng thái duyệt các bài đăng của CLB." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <MyPosts />
    </RoleGate>
  ),
});

type BaiDangKemKiemDuyet = BaiDang & { kiem_duyet: LuotKiemDuyet[] };

const TAB_TRANG_THAI: [TrangThaiKiemDuyet | "TatCa", string][] = [
  ["TatCa", "Tất cả"],
  ["DaDuyet", "Đã duyệt"],
  ["ChoDuyet", "Chờ duyệt"],
  ["TuChoi", "Bị từ chối"],
];

function MyPosts() {
  const { maCLB } = useAuth();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<BaiDang | null>(null);
  const [lichSu, setLichSu] = useState<BaiDangKemKiemDuyet | null>(null);
  const [trangThai, setTrangThai] = useState<TrangThaiKiemDuyet | "TatCa">("TatCa");
  const [loai, setLoai] = useState<"TatCa" | "TinBai" | "SuKien">("TatCa");
  const [tuKhoa, setTuKhoa] = useState("");

  const q = useQuery({
    queryKey: ["bai_dang_cua_toi", maCLB],
    enabled: !!maCLB,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bai_dang")
        .select("*, su_kien(*), kiem_duyet(*)")
        .eq("MaCLB", maCLB!)
        .order("NgayTao", { ascending: false })
        .order("ThoiGianKiemDuyet", { referencedTable: "kiem_duyet", ascending: false });
      if (error) throw error;
      return data as unknown as BaiDangKemKiemDuyet[];
    },
  });

  const tatCa = q.data ?? [];
  const ds = tatCa.filter(
    (p) =>
      (trangThai === "TatCa" || p.TrangThaiKiemDuyet === trangThai) &&
      (loai === "TatCa" || (loai === "SuKien") === (p.LoaiBaiDang === "SuKien")) &&
      (!tuKhoa.trim() || p.TieuDe.toLowerCase().includes(tuKhoa.trim().toLowerCase())),
  );

  if (!maCLB)
    return (
      <Page title="Bài đăng của tôi">
        <Empty text="Tài khoản chưa được gán CLB nào" />
      </Page>
    );

  return (
    <Page
      title="Bài đăng của tôi"
      subtitle="Theo dõi trạng thái kiểm duyệt; bấm “Xem bài” để thấy bài như sinh viên nhìn thấy"
      actions={
        <Button asChild className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
          <Link to="/clb/dang-bai">
            <Plus className="h-4 w-4" /> Đăng bài
          </Link>
        </Button>
      }
    >
      {/* Lọc theo trạng thái kiểm duyệt – PTTKHT câu hỏi 9: theo dõi chờ duyệt / đã duyệt / bị từ chối */}
      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Trạng thái bài đăng">
        {TAB_TRANG_THAI.map(([k, nhan]) => {
          const so = k === "TatCa" ? tatCa.length : tatCa.filter((p) => p.TrangThaiKiemDuyet === k).length;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={trangThai === k}
              onClick={() => setTrangThai(k)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
                trangThai === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:border-primary hover:text-primary",
              )}
            >
              {nhan}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  trangThai === k ? "bg-white/20" : "bg-secondary text-secondary-foreground",
                )}
              >
                {so}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(
          [
            ["TatCa", "Mọi loại"],
            ["TinBai", "Tin bài"],
            ["SuKien", "Sự kiện"],
          ] as const
        ).map(([k, nhan]) => (
          <button
            key={k}
            onClick={() => setLoai(k)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition",
              loai === k ? "bg-secondary text-primary" : "text-muted-foreground hover:text-primary",
            )}
          >
            {nhan}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm theo tiêu đề..."
            className="h-9 bg-card pl-9"
          />
        </div>
      </div>

      {q.isLoading ? (
        <GridSkeleton n={3} />
      ) : !tatCa.length ? (
        <Empty
          text="Chưa có bài đăng nào"
          action={
            <Button asChild className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
              <Link to="/clb/dang-bai">
                <Plus className="h-4 w-4" /> Đăng bài đầu tiên
              </Link>
            </Button>
          }
        />
      ) : !ds.length ? (
        <Empty text="Không có bài đăng nào phù hợp" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ds.map((p) => {
            const moiNhat = p.kiem_duyet?.[0];
            return (
              <article
                key={p.MaBaiDang}
                className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]"
              >
                <div className="relative aspect-[16/9] bg-gradient-to-br from-primary to-primary-dark">
                  {p.AnhBia && <img src={p.AnhBia} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  <span className="absolute left-3 top-3">
                    <TrangThaiKiemDuyetBadge trangThai={p.TrangThaiKiemDuyet} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <LoaiBaiDangBadge loai={p.LoaiBaiDang} />
                    <span className="text-xs font-semibold text-muted-foreground">
                      {p.NgayDang ? `Đăng ${formatDateTime(p.NgayDang)}` : `Gửi ${formatDateTime(p.NgayTao)}`}
                    </span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-base leading-snug">{p.TieuDe}</h3>
                  {p.su_kien && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatKhoangThoiGian(p.su_kien.ThoiGianBatDau, p.su_kien.ThoiGianKetThuc)}
                    </p>
                  )}
                  <p className="mb-4 mt-1 line-clamp-2 text-sm text-muted-foreground">{vanBanThuan(p.NoiDung)}</p>
                  {p.TrangThaiKiemDuyet === "TuChoi" && (
                    <p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive">
                      Lý do từ chối: {moiNhat?.LyDoTuChoi || "không ghi nhận"}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t pt-3">
                    <Button asChild size="sm" variant="ghost" className="font-bold text-primary">
                      <Link to="/bai-viet/$id" params={{ id: String(p.MaBaiDang) }} target="_blank" rel="noreferrer">
                        <Eye className="h-3.5 w-3.5" /> Xem bài
                      </Link>
                    </Button>
                    {!!p.kiem_duyet?.length && (
                      <Button size="sm" variant="ghost" onClick={() => setLichSu(p)}>
                        <History className="h-3.5 w-3.5" /> Lịch sử
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                      {p.TrangThaiKiemDuyet === "TuChoi" ? "Sửa & gửi lại" : "Sửa"}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bài đăng</DialogTitle>
          </DialogHeader>
          {edit && (
            <PostForm
              maCLB={edit.MaCLB}
              initial={edit}
              onCancel={() => setEdit(null)}
              onDone={() => {
                setEdit(null);
                qc.invalidateQueries({ queryKey: ["bai_dang_cua_toi"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!lichSu} onOpenChange={(o) => !o && setLichSu(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lịch sử kiểm duyệt</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-semibold text-muted-foreground">{lichSu?.TieuDe}</p>
          <ul className="space-y-3">
            {lichSu?.kiem_duyet?.map((kd) => (
              <li key={kd.MaKiemDuyet} className="rounded-xl border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <TrangThaiKiemDuyetBadge trangThai={kd.KetQuaKiemDuyet} />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {formatDateTime(kd.ThoiGianKiemDuyet)}
                  </span>
                </div>
                {kd.LyDoTuChoi && <p className="mt-2 text-destructive">Lý do: {kd.LyDoTuChoi}</p>}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
