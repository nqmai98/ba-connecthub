import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  NHAN_LOAI_BAI_DANG,
  NHAN_LOAI_SU_KIEN,
  NHAN_TRUONG_CLB,
  TRUONG_CLB_CO_THE_SUA,
  uploadImage,
  useLinhVuc,
  type BaiDang,
  type CauLacBo,
  type LoaiBaiDang,
  type LoaiSuKien,
  type TruongCLBCoTheSua,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ChonNam } from "@/components/ChonNam";
import { DON_VI_MAC_DINH, nhanDonVi } from "@/lib/so-do-to-chuc";
import { anhTrongBai, lamSachHtml, vanBanThuan } from "@/lib/noi-dung";

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
}) {
  const { maNguoiDung } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-20 w-28 rounded-xl border object-cover" />
        ) : (
          <div className="grid h-20 w-28 place-items-center rounded-xl border border-dashed text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
        <label className="cursor-pointer rounded-xl border px-3 py-2 text-sm font-bold hover:bg-muted">
          {busy ? "Đang tải..." : "Chọn ảnh"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f || !maNguoiDung) return;
              setBusy(true);
              try {
                onChange(await uploadImage(f, maNguoiDung));
                toast.success("Đã tải ảnh lên");
              } catch (err) {
                toast.error((err as Error).message || "Tải ảnh thất bại");
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}

/** ISO -> giá trị cho <input type="datetime-local"> theo giờ địa phương. */
const toLocal = (iso: string | null | undefined) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

/* ================================================================== */
/* Bài đăng (bai_dang + bảng con su_kien)                              */
/* ================================================================== */

export function PostForm({
  maCLB,
  initial,
  onDone,
  onCancel,
}: {
  maCLB: number;
  initial?: BaiDang;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    LoaiBaiDang: initial?.LoaiBaiDang ?? ("TinTuc" as LoaiBaiDang),
    TieuDe: initial?.TieuDe ?? "",
    NoiDung: initial?.NoiDung ?? "",
    AnhBia: initial?.AnhBia ?? null,
    LoaiSuKien: initial?.su_kien?.LoaiSuKien ?? ("PhiHocThuat" as LoaiSuKien),
    ThoiGianBatDau: toLocal(initial?.su_kien?.ThoiGianBatDau),
    ThoiGianKetThuc: toLocal(initial?.su_kien?.ThoiGianKetThuc),
    DiaDiem: initial?.su_kien?.DiaDiem ?? "",
  });
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const laSuKien = f.LoaiBaiDang === "SuKien";

  const submit = async () => {
    const e: Record<string, boolean> = {
      TieuDe: !f.TieuDe.trim(),
      NoiDung: !vanBanThuan(f.NoiDung).trim() && !anhTrongBai(f.NoiDung).length,
      ThoiGianBatDau: laSuKien && !f.ThoiGianBatDau,
      ThoiGianKetThuc: laSuKien && !f.ThoiGianKetThuc,
      DiaDiem: laSuKien && !f.DiaDiem.trim(),
    };
    setErrs(e);
    if (Object.values(e).some(Boolean)) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }
    if (laSuKien && new Date(f.ThoiGianKetThuc) < new Date(f.ThoiGianBatDau)) {
      setErrs({ ThoiGianKetThuc: true });
      toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
      return;
    }

    setBusy(true);
    try {
      const baiDang = {
        LoaiBaiDang: f.LoaiBaiDang,
        TieuDe: f.TieuDe.trim().slice(0, 255),
        // HTML từ trình soạn thảo, lọc lại lần nữa trước khi lưu
        NoiDung: lamSachHtml(f.NoiDung).trim().slice(0, 200000),
        AnhBia: f.AnhBia,
      };

      let maBaiDang = initial?.MaBaiDang;
      if (maBaiDang) {
        const r = await supabase.from("bai_dang").update(baiDang).eq("MaBaiDang", maBaiDang);
        if (r.error) throw r.error;
      } else {
        const r = await supabase
          .from("bai_dang")
          .insert({ ...baiDang, MaCLB: maCLB })
          .select("MaBaiDang")
          .single();
        if (r.error || !r.data) throw r.error ?? new Error("Không tạo được bài đăng");
        maBaiDang = r.data.MaBaiDang;
      }

      // Bảng con su_kien chỉ tồn tại khi bài đăng thuộc loại Sự kiện
      if (laSuKien) {
        const r = await supabase.from("su_kien").upsert({
          MaBaiDang: maBaiDang,
          LoaiSuKien: f.LoaiSuKien,
          ThoiGianBatDau: new Date(f.ThoiGianBatDau).toISOString(),
          ThoiGianKetThuc: new Date(f.ThoiGianKetThuc).toISOString(),
          DiaDiem: f.DiaDiem.trim().slice(0, 255),
        });
        if (r.error) throw r.error;
      } else if (initial?.su_kien) {
        const r = await supabase.from("su_kien").delete().eq("MaBaiDang", maBaiDang);
        if (r.error) throw r.error;
      }

      toast.success("Gửi bài thành công, bài đăng đang chờ duyệt");
      onDone();
    } catch (err) {
      toast.error("Gửi bài thất bại: " + ((err as Error).message || "không rõ nguyên nhân"));
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) => (errs[k] ? "border-destructive ring-1 ring-destructive" : "");
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Loại bài đăng</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NHAN_LOAI_BAI_DANG) as LoaiBaiDang[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setF({ ...f, LoaiBaiDang: t })}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-bold",
                f.LoaiBaiDang === t ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {NHAN_LOAI_BAI_DANG[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Tiêu đề *</Label>
        <Input
          className={err("TieuDe")}
          maxLength={255}
          value={f.TieuDe}
          onChange={(e) => setF({ ...f, TieuDe: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Nội dung *</Label>
        <RichTextEditor
          value={f.NoiDung}
          loi={!!errs["NoiDung"]}
          onChange={(html) => setF((cu) => ({ ...cu, NoiDung: html }))}
          placeholder="Viết nội dung đăng bài..."
        />
      </div>

      {laSuKien && (
        <div className="space-y-4 rounded-xl border border-dashed p-4">
          <p className="text-sm font-bold text-primary">Thông tin sự kiện</p>
          <div className="space-y-1.5">
            <Label>Loại sự kiện</Label>
            <div className="flex gap-2">
              {(Object.keys(NHAN_LOAI_SU_KIEN) as LoaiSuKien[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setF({ ...f, LoaiSuKien: t })}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold",
                    f.LoaiSuKien === t ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {NHAN_LOAI_SU_KIEN[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Thời gian bắt đầu *</Label>
              <Input
                className={err("ThoiGianBatDau")}
                type="datetime-local"
                value={f.ThoiGianBatDau}
                onChange={(e) => setF({ ...f, ThoiGianBatDau: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thời gian kết thúc *</Label>
              <Input
                className={err("ThoiGianKetThuc")}
                type="datetime-local"
                value={f.ThoiGianKetThuc}
                onChange={(e) => setF({ ...f, ThoiGianKetThuc: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Địa điểm *</Label>
            <Input
              className={err("DiaDiem")}
              maxLength={255}
              value={f.DiaDiem}
              onChange={(e) => setF({ ...f, DiaDiem: e.target.value })}
            />
          </div>
        </div>
      )}

      <ImageField
        label="Ảnh bìa (hiển thị ở danh sách tin và đầu bài viết)"
        value={f.AnhBia}
        onChange={(v) => setF({ ...f, AnhBia: v })}
      />
      {Object.values(errs).some(Boolean) && (
        <p className="text-sm font-semibold text-destructive">
          Các trường đánh dấu đỏ là bắt buộc.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setConfirmCancel(true)}>
          Hủy
        </Button>
        <Button
          disabled={busy}
          onClick={submit}
          className="bg-accent font-bold text-accent-foreground hover:bg-accent/90"
        >
          {busy ? "Đang gửi..." : "Gửi duyệt"}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Hủy bài đăng?"
        description="Nội dung bạn đã nhập sẽ không được lưu."
        confirmText="Hủy bài"
        destructive
        onConfirm={onCancel}
      />
    </div>
  );
}

/* ================================================================== */
/* Thông tin CLB                                                       */
/* ================================================================== */

export type CLBDraft = {
  MaCLB?: number;
  TenCLB: string;
  NamThanhLap: number | null;
  MaLinhVuc: number | null;
  DonViTrucThuoc: string | null;
  MoTa: string | null;
  LogoCLB: string | null;
  ThongTinLienHe: string | null;
  EmailLienHe: string | null;
  Fanpage: string | null;
  GioiThieuNgan: string | null;
  BanChuyenMon: string | null;
  ThanhTich: string | null;
  AnhBia: string | null;
  TrangThaiHoatDong: CauLacBo["TrangThaiHoatDong"];
  NoiBat: boolean;
};

export const CLB_RONG: CLBDraft = {
  TenCLB: "",
  NamThanhLap: null,
  MaLinhVuc: null,
  DonViTrucThuoc: null,
  MoTa: null,
  LogoCLB: null,
  ThongTinLienHe: null,
  EmailLienHe: null,
  Fanpage: null,
  GioiThieuNgan: null,
  BanChuyenMon: null,
  ThanhTich: null,
  AnhBia: null,
  TrangThaiHoatDong: "DangHoatDong",
  NoiBat: false,
};

export function clbSangDraft(c: CauLacBo): CLBDraft {
  return {
    MaCLB: c.MaCLB,
    TenCLB: c.TenCLB,
    NamThanhLap: c.NamThanhLap,
    MaLinhVuc: c.MaLinhVuc,
    DonViTrucThuoc: c.DonViTrucThuoc,
    MoTa: c.MoTa,
    LogoCLB: c.LogoCLB,
    ThongTinLienHe: c.ThongTinLienHe,
    EmailLienHe: c.EmailLienHe ?? null,
    Fanpage: c.Fanpage,
    GioiThieuNgan: c.GioiThieuNgan,
    BanChuyenMon: c.BanChuyenMon,
    ThanhTich: c.ThanhTich,
    AnhBia: c.AnhBia,
    TrangThaiHoatDong: c.TrangThaiHoatDong,
    NoiBat: c.NoiBat,
  };
}

/**
 * - `cheDo="admin"`: Quản trị viên ghi trực tiếp vào bảng cau_lac_bo.
 * - `cheDo="yeu-cau"`: Đại diện CLB chỉ được GỬI YÊU CẦU cập nhật; bản ghi đi vào
 *   bảng yeu_cau_cap_nhat và chỉ áp dụng khi Quản trị viên duyệt (quan hệ 4 & 5).
 */
export function ClubForm({
  initial,
  cheDo,
  onSaved,
}: {
  initial: CLBDraft;
  cheDo: "admin" | "yeu-cau";
  onSaved: () => void;
}) {
  const { data: linhVuc } = useLinhVuc();
  const [f, setF] = useState<CLBDraft>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CLBDraft>(k: K, v: CLBDraft[K]) => setF({ ...f, [k]: v });

  const save = async () => {
    if (!f.TenCLB.trim()) {
      toast.error("Vui lòng nhập tên CLB");
      return;
    }
    if (!f.MaLinhVuc) {
      toast.error("Vui lòng chọn lĩnh vực hoạt động");
      return;
    }
    setBusy(true);
    try {
      if (cheDo === "admin") {
        const { MaCLB, ...row } = f;
        const email = row.EmailLienHe?.trim().toLowerCase() || null;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          toast.error("Email liên hệ không hợp lệ");
          setBusy(false);
          return;
        }
        const payload = {
          ...row,
          EmailLienHe: email,
          TenCLB: row.TenCLB.trim(),
          MaLinhVuc: f.MaLinhVuc,
        };
        const r = MaCLB
          ? await supabase.from("cau_lac_bo").update(payload).eq("MaCLB", MaCLB)
          : await supabase.from("cau_lac_bo").insert(payload);
        if (r.error) throw r.error;
        toast.success("Đã lưu thông tin CLB");
      } else {
        if (!f.MaCLB) throw new Error("Thiếu mã câu lạc bộ");
        // Chỉ gửi những trường thực sự thay đổi
        const thayDoi: Partial<Record<TruongCLBCoTheSua, unknown>> = {};
        for (const k of TRUONG_CLB_CO_THE_SUA) {
          const moi = k === "TenCLB" ? f.TenCLB.trim() : f[k as keyof CLBDraft];
          if (moi !== initial[k as keyof CLBDraft]) thayDoi[k] = moi;
        }
        if (!Object.keys(thayDoi).length) {
          toast.info("Bạn chưa thay đổi thông tin nào");
          setBusy(false);
          return;
        }
        const r = await supabase.from("yeu_cau_cap_nhat").insert({
          MaCLB: f.MaCLB,
          NoiDungThayDoi: JSON.stringify(thayDoi),
        });
        if (r.error) throw r.error;
        toast.success("Đã gửi yêu cầu cập nhật, đang chờ Quản trị viên duyệt");
      }
      onSaved();
    } catch (err) {
      toast.error("Lưu thất bại: " + ((err as Error).message || "không rõ nguyên nhân"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {cheDo === "yeu-cau" && (
        <p className="rounded-xl border border-dashed bg-muted p-3 text-sm font-semibold text-muted-foreground">
          Thay đổi của bạn sẽ được gửi tới Quản trị viên dưới dạng <b>yêu cầu cập nhật</b> và chỉ
          hiển thị công khai sau khi được duyệt.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{NHAN_TRUONG_CLB.TenCLB} *</Label>
          <Input maxLength={255} value={f.TenCLB} onChange={(e) => set("TenCLB", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{NHAN_TRUONG_CLB.MaLinhVuc} *</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={f.MaLinhVuc ?? ""}
            onChange={(e) => set("MaLinhVuc", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- Chọn --</option>
            {linhVuc?.map((lv) => (
              <option key={lv.MaLinhVuc} value={lv.MaLinhVuc}>
                {lv.TenLinhVuc}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{NHAN_TRUONG_CLB.NamThanhLap}</Label>
          <ChonNam value={f.NamThanhLap} onChange={(v) => set("NamThanhLap", v)} />
        </div>
        <div className="space-y-1.5">
          <Label>{NHAN_TRUONG_CLB.DonViTrucThuoc}</Label>
          {/* Đơn vị trực thuộc: Đoàn Thanh niên / Hội Sinh viên / Khác – quyết định khối trong bộ lọc Tổ chức */}
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={f.DonViTrucThuoc ?? ""}
            onChange={(e) => set("DonViTrucThuoc", e.target.value || null)}
          >
            <option value="">-- Chọn đơn vị trực thuộc --</option>
            {f.DonViTrucThuoc &&
              f.DonViTrucThuoc !== "Khác" &&
              !DON_VI_MAC_DINH.some((n) => nhanDonVi(n) === f.DonViTrucThuoc) && (
                <option value={f.DonViTrucThuoc}>{f.DonViTrucThuoc}</option>
              )}
            {(
              [
                ["DoanThanhNien", "Đoàn Thanh niên"],
                ["HoiSinhVien", "Hội Sinh viên"],
              ] as const
            ).map(([khoi, nhan]) => (
              <optgroup key={khoi} label={nhan}>
                {DON_VI_MAC_DINH.filter((n) => n.Khoi === khoi)
                  .sort((a, b) => a.ThuTu - b.ThuTu)
                  .map((n) => (
                    <option key={n.MaNhom} value={nhanDonVi(n)}>
                      {nhanDonVi(n)}
                    </option>
                  ))}
              </optgroup>
            ))}
            <option value="Khác">Khác</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{NHAN_TRUONG_CLB.ThongTinLienHe}</Label>
          <Input
            maxLength={255}
            placeholder="Email hoặc số điện thoại liên hệ"
            value={f.ThongTinLienHe ?? ""}
            onChange={(e) => set("ThongTinLienHe", e.target.value || null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{NHAN_TRUONG_CLB.Fanpage}</Label>
          <Input
            maxLength={255}
            placeholder="facebook.com/..."
            value={f.Fanpage ?? ""}
            onChange={(e) => set("Fanpage", e.target.value || null)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{NHAN_TRUONG_CLB.GioiThieuNgan}</Label>
        <Input
          maxLength={300}
          value={f.GioiThieuNgan ?? ""}
          onChange={(e) => set("GioiThieuNgan", e.target.value || null)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{NHAN_TRUONG_CLB.MoTa}</Label>
        <Textarea
          rows={5}
          maxLength={5000}
          value={f.MoTa ?? ""}
          onChange={(e) => set("MoTa", e.target.value || null)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{NHAN_TRUONG_CLB.BanChuyenMon}</Label>
        <Textarea
          rows={2}
          maxLength={2000}
          value={f.BanChuyenMon ?? ""}
          onChange={(e) => set("BanChuyenMon", e.target.value || null)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{NHAN_TRUONG_CLB.ThanhTich}</Label>
        <Textarea
          rows={3}
          maxLength={3000}
          value={f.ThanhTich ?? ""}
          onChange={(e) => set("ThanhTich", e.target.value || null)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageField
          label={NHAN_TRUONG_CLB.LogoCLB}
          value={f.LogoCLB}
          onChange={(v) => set("LogoCLB", v)}
        />
        <ImageField
          label={NHAN_TRUONG_CLB.AnhBia}
          value={f.AnhBia}
          onChange={(v) => set("AnhBia", v)}
        />
      </div>
      {cheDo === "admin" && (
        <div className="space-y-1.5">
          <Label>Email liên hệ của CLB</Label>
          <Input
            type="email"
            value={f.EmailLienHe ?? ""}
            maxLength={255}
            onChange={(e) => set("EmailLienHe", e.target.value || null)}
            placeholder="VD: clb@hvnh.edu.vn"
          />
        </div>
      )}
      {cheDo === "admin" && (
        <div className="flex flex-wrap items-end gap-5 text-sm font-semibold">
          <div className="space-y-1.5">
            <Label>Trạng thái hoạt động</Label>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={f.TrangThaiHoatDong}
              onChange={(e) =>
                set("TrangThaiHoatDong", e.target.value as CLBDraft["TrangThaiHoatDong"])
              }
            >
              <option value="DangHoatDong">Đang hoạt động</option>
              <option value="TamNgung">Tạm ngưng</option>
              <option value="NgungHoatDong">Ngừng hoạt động</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2.5">
            <input
              type="checkbox"
              checked={f.NoiBat}
              onChange={(e) => set("NoiBat", e.target.checked)}
            />{" "}
            CLB nổi bật
          </label>
        </div>
      )}
      <div className="flex justify-end">
        <Button disabled={busy} onClick={save} className="bg-primary font-bold">
          {busy ? "Đang lưu..." : cheDo === "admin" ? "Lưu thay đổi" : "Gửi yêu cầu cập nhật"}
        </Button>
      </div>
    </div>
  );
}
