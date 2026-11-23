import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Copy, Dices, KeyRound, ListTree, Mail, Pencil, Plus, Save, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  NHAN_KHOI,
  NHAN_TRANG_THAI_HOAT_DONG,
  useCauLacBo,
  useLinhVuc,
  type CauLacBo,
  type KhoiToChuc,
  type NhomToChuc,
} from "@/lib/data";
import { khoiCuaCLB, khoiTuDonVi, maNhomCuaCLB, useSoDoToChuc } from "@/lib/so-do-to-chuc";
import { createClubAccount, deleteClub, resetClubPassword } from "@/lib/admin.functions";
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
  // Mở từ thông báo "Yêu cầu cấp lại mật khẩu" của Đại diện CLB
  capLai: z.string().optional(),
  email: z.string().optional(),
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
 *  - Quản lý danh mục lĩnh vực (bảng linh_vuc) – chức năng "quản lý danh mục" trong PTTKHT.
 */
function ManageClubs() {
  const { q = "", khoi, nhom, capLai, email: emailYeuCau } = Route.useSearch();
  const navigate = useNavigate();
  const { data: clubs, isLoading } = useCauLacBo();
  const { data: dsNhom } = useSoDoToChuc();
  const qc = useQueryClient();

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
  const [capLaiMK, setCapLaiMK] = useState<{ club: CauLacBo; email: string } | null>(null);

  // Bấm thông báo "Yêu cầu cấp lại mật khẩu" -> tự mở hộp thoại cấp lại cho đúng CLB
  useEffect(() => {
    if (!capLai || !clubs || !reps.data) return;
    const ma = Object.entries(reps.data).find(([, u]) => u === capLai)?.[0];
    const club = ma ? clubs.find((c) => c.MaCLB === Number(ma)) : undefined;
    if (club) setCapLaiMK({ club, email: emailYeuCau ?? "" });
    else toast.error("Không tìm thấy CLB có tài khoản " + capLai);
    navigate({
      to: "/admin/clb",
      search: (s: SearchQL) => ({ ...s, capLai: undefined, email: undefined }),
      replace: true,
    });
  }, [capLai, clubs, reps.data]);

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
    // Thuộc Đoàn / Hội nhưng chưa xếp được vào ô xanh nào
    for (const k of Object.keys(NHAN_KHOI) as KhoiToChuc[]) {
      const cl = list.filter((c) => c.MaNhom == null && c.Khoi === k);
      if (cl.length) ds.push({ key: "khac-" + k, tieuDe: "Đơn vị khác", phu: NHAN_KHOI[k], clubs: cl });
    }
    const khac = list.filter((c) => c.Khoi == null && khoiTuDonVi(c.DonViTrucThuoc) === "Khac");
    if (khac.length) ds.push({ key: "khac", tieuDe: "Khác (không thuộc Đoàn / Hội)", clubs: khac });
    const chua = list.filter((c) => c.Khoi == null && khoiTuDonVi(c.DonViTrucThuoc) !== "Khac");
    if (chua.length) ds.push({ key: "chua", tieuDe: "Chưa chọn đơn vị trực thuộc", clubs: chua });
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
            <ListTree className="h-4 w-4" /> Danh mục lĩnh vực
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
                        onCapLaiMK={() => setCapLaiMK({ club: c, email: "" })}
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
      <CapLaiMatKhauDialog
        mo={capLaiMK}
        username={capLaiMK ? reps.data?.[capLaiMK.club.MaCLB] : undefined}
        onClose={() => setCapLaiMK(null)}
      />
      <DanhMucLinhVucDialog open={danhMuc} onClose={() => setDanhMuc(false)} clubs={tatCa} />
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
  onCapLaiMK,
}: {
  c: CLBKemNhom;
  taiKhoan: string | undefined;
  moi: boolean;
  onSua: () => void;
  onXoa: () => void;
  onCapTK: () => void;
  onCapLaiMK: () => void;
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
            {c.linh_vuc?.TenLinhVuc && <span>{c.linh_vuc.TenLinhVuc}</span>}
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
        {taiKhoan && (
          <Button variant="outline" size="sm" onClick={onCapLaiMK} className="rounded-xl font-bold">
            <KeyRound className="h-4 w-4" /> Cấp lại mật khẩu
          </Button>
        )}
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

/** Cấp lại mật khẩu cho tài khoản đại diện CLB, rồi gửi mật khẩu mới qua email CLB để lại. */
function CapLaiMatKhauDialog({
  mo,
  username,
  onClose,
}: {
  mo: { club: CauLacBo; email: string } | null;
  username: string | undefined;
  onClose: () => void;
}) {
  const reset = useServerFn(resetClubPassword);
  const [matKhau, setMatKhau] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [xong, setXong] = useState(false);

  useEffect(() => {
    if (!mo) return;
    setMatKhau(randomPassword());
    setEmail(mo.email);
    setXong(false);
  }, [mo]);

  const noiDung = () =>
    `Xin chào ${mo?.club.TenCLB ?? ""},\n\nQuản trị viên BAV CLUBS đã cấp lại mật khẩu cho tài khoản của CLB:\n` +
    `- Tên đăng nhập: ${username ?? ""}\n- Mật khẩu mới: ${matKhau}\n\n` +
    `Đăng nhập tại: ${window.location.origin}/clb/dang-nhap\n` +
    `Sau khi đăng nhập, vui lòng đổi mật khẩu ở trang Hồ sơ.`;

  const submit = async () => {
    if (!mo) return;
    if (matKhau.length < 8) return toast.error("Mật khẩu tối thiểu 8 ký tự");
    setBusy(true);
    try {
      await reset({ data: { maCLB: mo.club.MaCLB, password: matKhau } });
      toast.success("Đã cấp lại mật khẩu cho " + mo.club.TenCLB);
      setXong(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(noiDung());
      toast.success("Đã sao chép thông tin đăng nhập");
    } catch {
      toast.error("Không thể sao chép, hãy chép thủ công");
    }
  };

  const guiEmail = () => {
    const tieuDe = "BAV CLUBS – Cấp lại mật khẩu tài khoản CLB";
    window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(tieuDe)}&body=${encodeURIComponent(noiDung())}`;
  };

  return (
    <Dialog open={!!mo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{xong ? "Đã cấp lại mật khẩu" : "Cấp lại mật khẩu"}</DialogTitle>
        </DialogHeader>
        {xong ? (
          <div className="space-y-3">
            <div className="space-y-1 rounded-xl border bg-muted p-4 text-sm">
              <div>
                <span className="font-semibold text-muted-foreground">CLB: </span>
                <b>{mo?.club.TenCLB}</b>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Tên đăng nhập: </span>
                <b>{username}</b>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Mật khẩu mới: </span>
                <b>{matKhau}</b>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email nhận mật khẩu</Label>
              <Input
                type="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@vidu.com"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copy}>
                <Copy className="h-4 w-4" /> Sao chép
              </Button>
              <Button
                variant="outline"
                disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                onClick={guiEmail}
              >
                <Mail className="h-4 w-4" /> Gửi email
              </Button>
              <Button onClick={onClose} className="bg-primary font-bold">
                Xong
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Câu lạc bộ</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-bold">
                  {mo?.club.TenCLB}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tên đăng nhập</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm font-bold">
                  <KeyRound className="h-4 w-4 text-muted-foreground" /> {username}
                </div>
              </div>
              {mo?.email && (
                <div className="space-y-1.5">
                  <Label>Email CLB để lại</Label>
                  <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm font-bold">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {mo.email}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Mật khẩu mới * (tối thiểu 8 ký tự)</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={matKhau}
                    maxLength={72}
                    autoComplete="off"
                    onChange={(e) => setMatKhau(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setMatKhau(randomPassword())}
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
                {busy ? "Đang lưu..." : "Cấp lại mật khẩu"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
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
  const [form, setForm] = useState({ clubName: "", username: "", password: "", emailLienHe: "" });
  const [done, setDone] = useState<{ clubName: string; username: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mo) return;
    setCheDo(mo.maCLB ? "co-san" : "moi");
    setMaCLB(mo.maCLB ?? null);
    setForm({ clubName: "", username: "", password: randomPassword(), emailLienHe: "" });
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
    const emailLienHe = form.emailLienHe.trim().toLowerCase();
    if (emailLienHe && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLienHe)) {
      toast.error("Email liên hệ không hợp lệ");
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
          ...(emailLienHe ? { emailLienHe } : {}),
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
                <Label>Email liên hệ của CLB</Label>
                <Input
                  type="email"
                  value={form.emailLienHe}
                  maxLength={255}
                  autoComplete="off"
                  onChange={(e) => setForm({ ...form, emailLienHe: e.target.value })}
                  placeholder="VD: clb@hvnh.edu.vn"
                />
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

/** Quản lý danh mục lĩnh vực (bảng linh_vuc) – PTTKHT: Quản trị viên quản lý danh mục. */
function DanhMucLinhVucDialog({
  open,
  onClose,
  clubs,
}: {
  open: boolean;
  onClose: () => void;
  clubs: CauLacBo[];
}) {
  const { data: linhVuc } = useLinhVuc();
  const qc = useQueryClient();
  const [moi, setMoi] = useState({ ten: "", moTa: "" });
  const [sua, setSua] = useState<Record<number, { ten: string; moTa: string }>>({});
  const [busy, setBusy] = useState(false);
  const dem = (ma: number) => clubs.filter((c) => c.MaLinhVuc === ma).length;
  const lamMoi = () => qc.invalidateQueries({ queryKey: ["linh_vuc"] });

  const them = async () => {
    if (!moi.ten.trim()) {
      toast.error("Vui lòng nhập tên lĩnh vực");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("linh_vuc")
      .insert({ TenLinhVuc: moi.ten.trim().slice(0, 100), MoTa: moi.moTa.trim() || null });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Lĩnh vực này đã tồn tại" : "Thêm thất bại: " + error.message);
      return;
    }
    toast.success("Đã thêm lĩnh vực");
    setMoi({ ten: "", moTa: "" });
    lamMoi();
  };

  const luu = async (ma: number) => {
    const v = sua[ma];
    if (!v?.ten.trim()) {
      toast.error("Tên lĩnh vực không được để trống");
      return;
    }
    const { error } = await supabase
      .from("linh_vuc")
      .update({ TenLinhVuc: v.ten.trim().slice(0, 100), MoTa: v.moTa.trim() || null })
      .eq("MaLinhVuc", ma);
    if (error) {
      toast.error("Lưu thất bại: " + error.message);
      return;
    }
    toast.success("Đã lưu");
    setSua(({ [ma]: _bo, ...rest }) => rest);
    lamMoi();
    qc.invalidateQueries({ queryKey: ["cau_lac_bo"] });
  };

  const xoa = async (ma: number) => {
    const { error } = await supabase.from("linh_vuc").delete().eq("MaLinhVuc", ma);
    if (error) {
      toast.error("Không xóa được: lĩnh vực đang được CLB sử dụng");
      return;
    }
    toast.success("Đã xóa lĩnh vực");
    lamMoi();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Khung cố định chiều cao: danh sách cuộn bên trong, ô thêm mới luôn nằm ở đáy */}
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-4 overflow-hidden p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>Danh mục lĩnh vực</DialogTitle>
          <p className="text-sm font-semibold text-muted-foreground">
            {(linhVuc ?? []).length} lĩnh vực
          </p>
        </DialogHeader>
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto rounded-xl border">
          {(linhVuc ?? []).map((lv) => {
            const dangSua = sua[lv.MaLinhVuc];
            const so = dem(lv.MaLinhVuc);
            return (
              <li key={lv.MaLinhVuc} className="p-3">
                {dangSua ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
                    <Input
                      value={dangSua.ten}
                      maxLength={100}
                      onChange={(e) => setSua({ ...sua, [lv.MaLinhVuc]: { ...dangSua, ten: e.target.value } })}
                    />
                    <Input
                      value={dangSua.moTa}
                      placeholder="Mô tả (không bắt buộc)"
                      onChange={(e) => setSua({ ...sua, [lv.MaLinhVuc]: { ...dangSua, moTa: e.target.value } })}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSua(({ [lv.MaLinhVuc]: _bo, ...r }) => r)}>
                        Hủy
                      </Button>
                      <Button size="sm" className="bg-primary font-bold" onClick={() => luu(lv.MaLinhVuc)}>
                        <Save className="h-4 w-4" /> Lưu
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-bold">{lv.TenLinhVuc}</div>
                      {lv.MoTa && <div className="line-clamp-2 text-xs text-muted-foreground">{lv.MoTa}</div>}
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                      {so} CLB
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={"Sửa " + lv.TenLinhVuc}
                      onClick={() => setSua({ ...sua, [lv.MaLinhVuc]: { ten: lv.TenLinhVuc, moTa: lv.MoTa ?? "" } })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={so > 0}
                      title={so > 0 ? "Đang có CLB thuộc lĩnh vực này" : undefined}
                      aria-label={"Xóa " + lv.TenLinhVuc}
                      className="text-destructive hover:text-destructive"
                      onClick={() => xoa(lv.MaLinhVuc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="shrink-0 rounded-xl border border-dashed bg-muted/40 p-3">
          <Label className="font-bold">Thêm lĩnh vực mới</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <Input value={moi.ten} maxLength={100} placeholder="Tên lĩnh vực" onChange={(e) => setMoi({ ...moi, ten: e.target.value })} />
            <Input value={moi.moTa} placeholder="Mô tả (không bắt buộc)" onChange={(e) => setMoi({ ...moi, moTa: e.target.value })} />
            <Button disabled={busy} onClick={them} className="bg-primary font-bold">
              <Plus className="h-4 w-4" /> Thêm
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
