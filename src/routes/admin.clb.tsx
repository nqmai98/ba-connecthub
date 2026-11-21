import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Copy,
  Dices,
  DownloadCloud,
  KeyRound,
  ListTree,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dbMoi } from "@/lib/db-moi";
import {
  NHAN_KHOI,
  NHAN_TRANG_THAI_HOAT_DONG,
  useCauLacBo,
  type CauLacBo,
  type KhoiToChuc,
  type NhomToChuc,
} from "@/lib/data";
import { khoiCuaCLB, maNhomCuaCLB, useSoDoToChuc } from "@/lib/so-do-to-chuc";
import { createClubAccount, deleteClub } from "@/lib/admin.functions";
import { USERNAME_HINT, USERNAME_REGEX } from "@/lib/club-account";
import { Card, ClubLogo, Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { ClubForm, clbSangDraft } from "@/components/forms";
import { FilterChip, FilterGroup, ResultBar, SearchBar, boDau } from "@/components/student/Filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const search = z.object({
  q: z.string().optional(),
  khoi: z.enum(["DoanThanhNien", "HoiSinhVien", "ChuaPhanLoai"]).optional(),
  nhom: z.coerce.number().int().optional(),
});
type SearchQL = z.infer<typeof search>;

export const Route = createFileRoute("/admin/clb")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Quản lý CLB – Quản trị BAV CLUBS" },
      { name: "description", content: "Quản lý câu lạc bộ và cấp tài khoản cho đại diện CLB." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <ManageClubs />
    </RoleGate>
  ),
});

type CLBKemNhom = CauLacBo & { MaNhom: number | null; Khoi: KhoiToChuc | null };

/**
 * Quản lý CLB (PTTKHT Hình 14):
 *  - Một nút duy nhất "Thêm tài khoản CLB": tạo tài khoản đại diện (kèm hồ sơ CLB mới nếu CLB chưa có).
 *    Thông tin chi tiết của CLB do đại diện tự cập nhật; Quản trị viên sửa được bất kỳ lúc nào.
 *  - Phân nhóm theo sơ đồ tổ chức Đoàn Thanh niên – Hội Sinh viên giống giao diện Sinh viên.
 *  - Quản lý danh mục đơn vị trong sơ đồ tổ chức (bảng don_vi_to_chuc) – chức năng "quản lý danh mục".
 */
function ManageClubs() {
  const { q = "", khoi, nhom } = Route.useSearch();
  const navigate = useNavigate();
  const { data: clubs, isLoading } = useCauLacBo();
  const { data: dsNhom, chuaNhap, chuaCoCauTruc } = useSoDoToChuc();
  const qc = useQueryClient();
  const [dangNhap, setDangNhap] = useState(false);

  /** Chạy hàm CSDL khoi_tao_so_do_to_chuc: thêm 9 đơn vị, xếp CLB cũ, thêm CLB còn thiếu trong sơ đồ. */
  const nhapSoDo = async () => {
    setDangNhap(true);
    const { data, error } = await dbMoi.rpc("khoi_tao_so_do_to_chuc");
    setDangNhap(false);
    if (error) {
      toast.error("Chưa nhập được sơ đồ tổ chức. Kiểm tra CSDL đã có cấu trúc mới rồi thử lại.");
      return;
    }
    const kq = data as { DonViMoi: number; CLBDuocXep: number; CLBMoi: number };
    toast.success(
      `Đã nhập sơ đồ: ${kq.DonViMoi} đơn vị mới · xếp ${kq.CLBDuocXep} CLB đang có · thêm ${kq.CLBMoi} CLB`,
    );
    qc.invalidateQueries({ queryKey: ["don_vi_to_chuc"] });
    qc.invalidateQueries({ queryKey: ["cau_lac_bo"] });
  };

  // Quan hệ 1–1: mỗi CLB có tối đa một tài khoản đại diện (nguoi_dung.MaCLB UNIQUE)
  const reps = useQuery({
    queryKey: ["dai-dien-clb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nguoi_dung")
        .select("MaNguoiDung, MaCLB, TenDangNhap, EmailTruong")
        .not("MaCLB", "is", null);
      if (error) throw error;
      const map: Record<number, string> = {};
      for (const r of data ?? [])
        if (r.MaCLB !== null) map[r.MaCLB] = r.TenDangNhap ?? r.EmailTruong;
      return map;
    },
  });

  const [themTK, setThemTK] = useState<{ maCLB?: number } | null>(null);
  const [edit, setEdit] = useState<CauLacBo | null>(null);
  const [toDelete, setToDelete] = useState<CauLacBo | null>(null);
  const [danhMuc, setDanhMuc] = useState(false);
  const [fresh, setFresh] = useState<number | null>(null);

  const nhomTheoMa = useMemo(() => new Map(dsNhom.map((n) => [n.MaNhom, n])), [dsNhom]);
  const tatCa: CLBKemNhom[] = useMemo(
    () => (clubs ?? []).map((c) => ({ ...c, MaNhom: maNhomCuaCLB(c, dsNhom), Khoi: khoiCuaCLB(c, dsNhom) })),
    [clubs, dsNhom],
  );
  const khoiCua = (c: CLBKemNhom) => c.Khoi;

  const theoTuKhoa = useMemo(() => {
    const k = boDau(q.trim());
    return k
      ? tatCa.filter((c) => boDau(`${c.TenCLB} ${reps.data?.[c.MaCLB] ?? ""}`).includes(k))
      : tatCa;
  }, [tatCa, q, reps.data]);
  const theoKhoi = theoTuKhoa.filter((c) =>
    !khoi ? true : khoi === "ChuaPhanLoai" ? c.Khoi == null : khoiCua(c) === khoi,
  );
  const list = theoKhoi.filter((c) => !nhom || c.MaNhom === nhom);
  const chuaCoTK = tatCa.filter((c) => !reps.data?.[c.MaCLB]).length;

  // Nhóm danh sách theo đơn vị để dễ nhìn khi có hàng chục CLB
  const nhomHienThi = useMemo(() => {
    const thuTu = [...dsNhom].sort((a, b) =>
      a.Khoi === b.Khoi ? a.ThuTu - b.ThuTu : a.Khoi === "DoanThanhNien" ? -1 : 1,
    );
    const ds: { key: string; tieuDe: string; phu?: string; clubs: CLBKemNhom[] }[] = thuTu
      .map((n) => ({
        key: String(n.MaNhom),
        tieuDe: n.TenNhom,
        phu: NHAN_KHOI[n.Khoi],
        clubs: list.filter((c) => c.MaNhom === n.MaNhom),
      }))
      .filter((g) => g.clubs.length);
    const khac = list.filter((c) => c.MaNhom == null);
    if (khac.length)
      ds.push({ key: "khac", tieuDe: "Khác / chưa xếp vào sơ đồ Đoàn – Hội", clubs: khac });
    return ds;
  }, [list, dsNhom]);

  const dat = (p: Partial<SearchQL>) =>
    navigate({ to: "/admin/clb", search: (s: SearchQL) => ({ ...s, ...p }), replace: true });

  return (
    <Page
      title="Quản lý CLB"
      subtitle={`${tatCa.length} câu lạc bộ · ${chuaCoTK} CLB chưa có tài khoản đại diện`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => setDanhMuc(true)}>
            <ListTree className="h-4 w-4" /> Sơ đồ tổ chức
          </Button>
          <Button
            onClick={() => setThemTK({})}
            className="rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90"
          >
            <UserPlus className="h-4 w-4" /> Thêm tài khoản CLB
          </Button>
        </div>
      }
    >
      {(chuaNhap || chuaCoCauTruc) && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-accent bg-accent/10 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-primary">
              {chuaCoCauTruc ? "CSDL chưa có cấu trúc sơ đồ tổ chức" : "Chưa nhập sơ đồ tổ chức Đoàn – Hội"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {chuaCoCauTruc
                ? "Cần chạy file sql/0009_cau_truc_tuong_tac_va_so_do_to_chuc.sql trên CSDL trước. CLB tạm hiện ở nhóm “Khác”."
                : "Thêm 9 đơn vị của sơ đồ, tự xếp các CLB đang có vào đúng ô và thêm các CLB, đội, ban, LCĐ, LCH còn thiếu. Bấm lại nhiều lần cũng không tạo trùng."}
            </p>
          </div>
          {chuaNhap && (
            <Button
              onClick={nhapSoDo}
              disabled={dangNhap}
              className="shrink-0 rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90"
            >
              <DownloadCloud className="h-4 w-4" />
              {dangNhap ? "Đang nhập…" : "Nhập sơ đồ tổ chức"}
            </Button>
          )}
        </div>
      )}

      <div className="mb-5 space-y-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <SearchBar
          value={q}
          placeholder="Tìm theo tên CLB hoặc tên đăng nhập..."
          onSearch={(v) => dat({ q: v || undefined })}
        />
        <FilterGroup label="Tổ chức">
          <FilterChip active={!khoi} count={theoTuKhoa.length} onClick={() => dat({ khoi: undefined, nhom: undefined })}>
            Tất cả
          </FilterChip>
          {(Object.keys(NHAN_KHOI) as KhoiToChuc[]).map((k) => (
            <FilterChip
              key={k}
              active={khoi === k}
              count={theoTuKhoa.filter((c) => khoiCua(c) === k).length}
              onClick={() => dat({ khoi: khoi === k ? undefined : k, nhom: undefined })}
            >
              {NHAN_KHOI[k]}
            </FilterChip>
          ))}
          <FilterChip
            active={khoi === "ChuaPhanLoai"}
            count={theoTuKhoa.filter((c) => c.Khoi == null).length}
            onClick={() => dat({ khoi: khoi === "ChuaPhanLoai" ? undefined : "ChuaPhanLoai", nhom: undefined })}
          >
            Khác / chưa chọn
          </FilterChip>
        </FilterGroup>
        {khoi && khoi !== "ChuaPhanLoai" && (
          <FilterGroup label="Đơn vị">
            <FilterChip active={!nhom} count={theoKhoi.length} onClick={() => dat({ nhom: undefined })}>
              Tất cả
            </FilterChip>
            {dsNhom
              .filter((n: NhomToChuc) => n.Khoi === khoi)
              .map((n) => (
                <FilterChip
                  key={n.MaNhom}
                  active={nhom === n.MaNhom}
                  count={theoKhoi.filter((c) => c.MaNhom === n.MaNhom).length}
                  onClick={() => dat({ nhom: nhom === n.MaNhom ? undefined : n.MaNhom })}
                >
                  {n.TenNhom}
                </FilterChip>
              ))}
          </FilterGroup>
        )}
      </div>

      {isLoading ? (
        <GridSkeleton n={3} />
      ) : !tatCa.length ? (
        <Empty text="Chưa có câu lạc bộ. Bấm “Thêm tài khoản CLB” để tạo CLB đầu tiên." />
      ) : (
        <>
          <ResultBar
            count={list.length}
            unit="câu lạc bộ"
            filtering={!!q || !!khoi || !!nhom}
            onClear={() => navigate({ to: "/admin/clb", search: {}, replace: true })}
          />
          {!list.length ? (
            <Empty text="Không tìm thấy câu lạc bộ phù hợp" />
          ) : (
            <div className="space-y-6">
              {nhomHienThi.map((g) => (
                <section key={g.key}>
                  <h2 className="mb-2 flex items-baseline gap-2 text-base">
                    <span className="h-4 w-1 self-center rounded-full bg-accent" />
                    {g.tieuDe}
                    {g.phu && <span className="text-xs font-bold text-muted-foreground">· {g.phu}</span>}
                    <span className="text-xs font-bold text-muted-foreground">({g.clubs.length})</span>
                  </h2>
                  <div className="divide-y overflow-hidden rounded-2xl border bg-card">
                    {g.clubs.map((c) => (
                      <DongCLB
                        key={c.MaCLB}
                        c={c}
                        taiKhoan={reps.data?.[c.MaCLB]}
                        moi={c.MaCLB === fresh}
                        onSua={() => setEdit(c)}
                        onXoa={() => setToDelete(c)}
                        onCapTK={() => setThemTK({ maCLB: c.MaCLB })}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sửa thông tin CLB – form điền sẵn dữ liệu hiện có, Quản trị viên chỉ sửa phần cần sửa */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sửa thông tin – {edit?.TenCLB}</DialogTitle>
          </DialogHeader>
          {edit && (
            <Card className="border-0 p-0 shadow-none">
              <ClubForm
                key={edit.MaCLB}
                initial={clbSangDraft(edit)}
                cheDo="admin"
                onSaved={() => {
                  setEdit(null);
                  qc.invalidateQueries({ queryKey: ["cau_lac_bo"] });
                }}
              />
            </Card>
          )}
        </DialogContent>
      </Dialog>

      <ThemTaiKhoanDialog
        mo={themTK}
        clubs={tatCa}
        taiKhoan={reps.data ?? {}}
        onClose={() => setThemTK(null)}
        onCreated={(id) => {
          setFresh(id);
          setTimeout(() => document.getElementById("club-" + id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
        }}
      />
      <DeleteDialog
        club={toDelete}
        account={toDelete ? reps.data?.[toDelete.MaCLB] : undefined}
        onClose={() => setToDelete(null)}
        onDeleted={(id) => setFresh((f) => (f === id ? null : f))}
      />
      <DanhMucDonViDialog open={danhMuc} onClose={() => setDanhMuc(false)} clubs={tatCa} />
    </Page>
  );
}

function DongCLB({
  c,
  taiKhoan,
  moi,
  onSua,
  onXoa,
  onCapTK,
}: {
  c: CLBKemNhom;
  taiKhoan: string | undefined;
  moi: boolean;
  onSua: () => void;
  onXoa: () => void;
  onCapTK: () => void;
}) {
  return (
    <div
      id={"club-" + c.MaCLB}
      className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", moi && "bg-accent/10")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ClubLogo club={c} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-primary">{c.TenCLB}</span>
            {moi && (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-extrabold text-accent-foreground">
                Vừa tạo
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{c.don_vi_to_chuc?.TenDonVi ?? "Khác"}</span>
            <span>· {NHAN_TRANG_THAI_HOAT_DONG[c.TrangThaiHoatDong]}</span>
            <span>·</span>
            {taiKhoan ? (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                <KeyRound className="h-3.5 w-3.5" /> {taiKhoan}
              </span>
            ) : (
              <button onClick={onCapTK} className="font-bold text-accent-foreground underline decoration-accent decoration-2 underline-offset-2">
                Chưa có tài khoản – cấp ngay
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={onSua} className="rounded-xl font-bold">
          <Pencil className="h-4 w-4" /> Sửa
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onXoa}
          aria-label={"Xóa " + c.TenCLB}
          className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const randomPassword = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
};

/**
 * "Thêm tài khoản CLB" – chức năng duy nhất để đưa CLB vào hệ thống:
 *  - CLB mới: nhập tên CLB -> hệ thống tạo hồ sơ CLB rỗng + tài khoản đại diện.
 *  - CLB đã có (chưa có tài khoản): chọn CLB -> chỉ tạo tài khoản đại diện.
 * Giới thiệu, logo, ảnh bìa... do đại diện CLB tự điền sau khi đăng nhập.
 */
function ThemTaiKhoanDialog({
  mo,
  clubs,
  taiKhoan,
  onClose,
  onCreated,
}: {
  mo: { maCLB?: number } | null;
  clubs: CauLacBo[];
  taiKhoan: Record<number, string>;
  onClose: () => void;
  onCreated: (maCLB: number) => void;
}) {
  const create = useServerFn(createClubAccount);
  const qc = useQueryClient();
  // "co-san" chỉ dùng khi bấm "Chưa có tài khoản – cấp ngay" ở một dòng CLB cụ thể
  const [cheDo, setCheDo] = useState<"moi" | "co-san">("moi");
  const [maCLB, setMaCLB] = useState<number | null>(null);
  const [form, setForm] = useState({ clubName: "", username: "", password: "" });
  const [done, setDone] = useState<{ clubName: string; username: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mo) return;
    setCheDo(mo.maCLB ? "co-san" : "moi");
    setMaCLB(mo.maCLB ?? null);
    setForm({ clubName: "", username: "", password: randomPassword() });
    setDone(null);
  }, [mo]);

  const clbChon = clubs.find((c) => c.MaCLB === maCLB);

  const submit = async () => {
    const username = form.username.trim().toLowerCase();
    const clubName = cheDo === "moi" ? form.clubName.trim() : (clbChon?.TenCLB ?? "");
    if (cheDo === "co-san" && !clbChon) {
      toast.error("Vui lòng chọn CLB cần cấp tài khoản");
      return;
    }
    if (clubName.length < 2) {
      toast.error("Vui lòng nhập tên đầy đủ CLB");
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      toast.error("Tên đăng nhập không hợp lệ: " + USERNAME_HINT);
      return;
    }
    if (form.password.length < 8) {
      toast.error("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    setBusy(true);
    try {
      const res = await create({
        data: {
          ...(cheDo === "co-san" && clbChon ? { maCLB: clbChon.MaCLB } : {}),
          clubName,
          username,
          password: form.password,
        },
      });
      toast.success("Đã tạo tài khoản cho " + clubName);
      await Promise.all([
        qc.refetchQueries({ queryKey: ["cau_lac_bo"] }),
        qc.refetchQueries({ queryKey: ["dai-dien-clb"] }),
        qc.invalidateQueries({ queryKey: ["admin-accounts"] }),
      ]);
      onCreated(res.maCLB);
      setDone({ clubName, username, password: form.password });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!done) return;
    try {
      await navigator.clipboard.writeText(
        `CLB: ${done.clubName}\nTên đăng nhập: ${done.username}\nMật khẩu: ${done.password}\nĐăng nhập tại: ${window.location.origin}/clb/dang-nhap`,
      );
      toast.success("Đã sao chép thông tin đăng nhập");
    } catch {
      toast.error("Không thể sao chép, hãy chép thủ công");
    }
  };

  return (
    <Dialog open={!!mo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {done ? "Tạo tài khoản thành công" : cheDo === "co-san" ? "Cấp tài khoản cho CLB" : "Thêm tài khoản CLB"}
          </DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="space-y-3">
            <div className="space-y-1 rounded-xl border bg-muted p-4 text-sm">
              <div>
                <span className="font-semibold text-muted-foreground">CLB: </span>
                <b>{done.clubName}</b>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Tên đăng nhập: </span>
                <b>{done.username}</b>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Mật khẩu: </span>
                <b>{done.password}</b>
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Mật khẩu chỉ hiển thị một lần này. Gửi cho đại diện CLB; họ đăng nhập ở trang “Đăng nhập
              Đại diện CLB” rồi tự cập nhật giới thiệu, logo, ảnh bìa của CLB.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={copy}>
                <Copy className="h-4 w-4" /> Sao chép
              </Button>
              <Button onClick={onClose} className="bg-primary font-bold">
                Xong
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {cheDo === "moi" ? (
                <div className="space-y-1.5">
                  <Label>Tên đầy đủ CLB *</Label>
                  <Input
                    value={form.clubName}
                    maxLength={255}
                    onChange={(e) => setForm({ ...form, clubName: e.target.value })}
                    placeholder="VD: SEC - CLB Chứng khoán"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Câu lạc bộ</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-bold">
                    {clbChon?.TenCLB}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Tên đăng nhập *</Label>
                <Input
                  value={form.username}
                  maxLength={30}
                  autoCapitalize="none"
                  autoComplete="off"
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                  placeholder="VD: sec.hvnh"
                />
                <p className="text-xs font-medium text-muted-foreground">{USERNAME_HINT}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Mật khẩu * (tối thiểu 8 ký tự)</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={form.password}
                    maxLength={72}
                    autoComplete="off"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setForm({ ...form, password: randomPassword() })}
                  >
                    <Dices className="h-4 w-4" /> Ngẫu nhiên
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button disabled={busy} onClick={submit} className="bg-primary font-bold">
                {busy ? "Đang tạo..." : "Tạo tài khoản"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Quản lý danh mục đơn vị trong sơ đồ tổ chức Đoàn Thanh niên – Hội Sinh viên (bảng don_vi_to_chuc).
 * Mặc định có 9 đơn vị theo sơ đồ; đổi tên đơn vị thì nhãn "Đơn vị trực thuộc" của các CLB tự cập nhật.
 * Xóa đơn vị đang có CLB: các CLB đó chuyển về "Khác" (CSDL: on delete set null) – nên chặn trên giao diện.
 */
function DanhMucDonViDialog({
  open,
  onClose,
  clubs,
}: {
  open: boolean;
  onClose: () => void;
  clubs: CauLacBo[];
}) {
  const { data: dsDonVi } = useSoDoToChuc();
  const qc = useQueryClient();
  const [moi, setMoi] = useState<{ khoi: KhoiToChuc; ten: string }>({ khoi: "HoiSinhVien", ten: "" });
  const [sua, setSua] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const dem = (ma: number) => clubs.filter((c) => c.MaDonVi === ma).length;
  const lamMoi = () => {
    qc.invalidateQueries({ queryKey: ["don_vi_to_chuc"] });
    qc.invalidateQueries({ queryKey: ["cau_lac_bo"] });
  };
  const trung = (e: { message: string; code?: string }) => e.code === "23505" || e.message.includes("duplicate");

  const them = async () => {
    if (!moi.ten.trim()) {
      toast.error("Vui lòng nhập tên đơn vị");
      return;
    }
    setBusy(true);
    const thuTu = Math.max(0, ...dsDonVi.filter((d) => d.Khoi === moi.khoi).map((d) => d.ThuTu)) + 1;
    const { error } = await dbMoi
      .from("don_vi_to_chuc")
      .insert({ Khoi: moi.khoi, TenDonVi: moi.ten.trim().slice(0, 100), ThuTu: thuTu });
    setBusy(false);
    if (error) {
      toast.error(trung(error) ? "Đơn vị này đã có trong khối" : "Chưa thêm được đơn vị, vui lòng thử lại");
      return;
    }
    toast.success("Đã thêm đơn vị");
    setMoi({ ...moi, ten: "" });
    lamMoi();
  };

  const luu = async (ma: number) => {
    const ten = sua[ma]?.trim();
    if (!ten) {
      toast.error("Tên đơn vị không được để trống");
      return;
    }
    const { error } = await dbMoi.from("don_vi_to_chuc").update({ TenDonVi: ten.slice(0, 100) }).eq("MaDonVi", ma);
    if (error) {
      toast.error(trung(error) ? "Tên này đã có trong khối" : "Chưa lưu được, vui lòng thử lại");
      return;
    }
    toast.success("Đã lưu");
    setSua(({ [ma]: _bo, ...rest }) => rest);
    lamMoi();
  };

  const xoa = async (ma: number) => {
    const { error } = await dbMoi.from("don_vi_to_chuc").delete().eq("MaDonVi", ma);
    if (error) {
      toast.error("Chưa xóa được đơn vị, vui lòng thử lại");
      return;
    }
    toast.success("Đã xóa đơn vị");
    lamMoi();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-4 overflow-hidden p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>Sơ đồ tổ chức Đoàn – Hội</DialogTitle>
          <p className="text-sm font-semibold text-muted-foreground">
            {dsDonVi.length} đơn vị · đơn vị đang có CLB thì không xóa được
          </p>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {(Object.keys(NHAN_KHOI) as KhoiToChuc[]).map((k) => (
            <section key={k}>
              <h3 className="mb-1.5 text-sm font-extrabold uppercase tracking-wide text-primary">{NHAN_KHOI[k]}</h3>
              <ul className="divide-y rounded-xl border">
                {dsDonVi
                  .filter((d) => d.Khoi === k)
                  .map((d) => {
                    const dangSua = sua[d.MaNhom];
                    const so = dem(d.MaNhom);
                    return (
                      <li key={d.MaNhom} className="p-3">
                        {dangSua !== undefined ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              aria-label="Tên đơn vị"
                              value={dangSua}
                              maxLength={100}
                              autoFocus
                              onChange={(e) => setSua({ ...sua, [d.MaNhom]: e.target.value })}
                              onKeyDown={(e) => e.key === "Enter" && luu(d.MaNhom)}
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSua(({ [d.MaNhom]: _bo, ...r }) => r)}>
                                Hủy
                              </Button>
                              <Button size="sm" className="bg-primary font-bold" onClick={() => luu(d.MaNhom)}>
                                <Save className="h-4 w-4" /> Lưu tên
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1 break-words font-bold">{d.TenNhom}</div>
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                              {so} CLB
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={"Đổi tên " + d.TenNhom}
                              title="Đổi tên"
                              onClick={() => setSua({ ...sua, [d.MaNhom]: d.TenNhom })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={so > 0}
                              title={so > 0 ? "Đang có CLB thuộc đơn vị này" : "Xóa đơn vị"}
                              aria-label={"Xóa " + d.TenNhom}
                              className="text-destructive hover:text-destructive"
                              onClick={() => xoa(d.MaNhom)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
        </div>
        <div className="shrink-0 rounded-xl border border-dashed bg-muted/40 p-3">
          <Label htmlFor="ten-don-vi-moi" className="font-bold">
            Thêm đơn vị mới
          </Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-[auto_1fr_auto]">
            <select
              aria-label="Khối"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={moi.khoi}
              onChange={(e) => setMoi({ ...moi, khoi: e.target.value as KhoiToChuc })}
            >
              {(Object.keys(NHAN_KHOI) as KhoiToChuc[]).map((k) => (
                <option key={k} value={k}>
                  {NHAN_KHOI[k]}
                </option>
              ))}
            </select>
            <Input
              id="ten-don-vi-moi"
              value={moi.ten}
              maxLength={100}
              onChange={(e) => setMoi({ ...moi, ten: e.target.value })}
            />
            <Button disabled={busy} onClick={them} className="bg-primary font-bold">
              <Plus className="h-4 w-4" /> Thêm đơn vị
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  club,
  account,
  onClose,
  onDeleted,
}: {
  club: CauLacBo | null;
  account?: string | undefined;
  onClose: () => void;
  onDeleted: (maCLB: number) => void;
}) {
  const remove = useServerFn(deleteClub);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!club) return;
    setBusy(true);
    try {
      await remove({ data: { maCLB: club.MaCLB } });
      toast.success("Đã xóa hồ sơ " + club.TenCLB);
      onDeleted(club.MaCLB);
      await qc.invalidateQueries();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!club} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa hồ sơ {club?.TenCLB}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm font-medium">
          <p>
            Thao tác này <b className="text-destructive">không thể hoàn tác</b>. Sẽ xóa vĩnh viễn:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Hồ sơ CLB và toàn bộ bài đăng, sự kiện của CLB</li>
            <li>Lịch sử kiểm duyệt và các yêu cầu cập nhật của CLB</li>
            <li>Lượt theo dõi CLB và lượt yêu thích sự kiện của CLB</li>
            <li>
              {account ? "Tài khoản đăng nhập: " + account : "Tài khoản đăng nhập của CLB (nếu có)"}
            </li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            disabled={busy}
            onClick={confirm}
            className="bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4" /> {busy ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
