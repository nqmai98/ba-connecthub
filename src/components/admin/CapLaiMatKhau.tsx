import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, CheckCircle2, Copy, Dices, KeyRound, Mail, TriangleAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  TIEU_DE_DA_DUYET,
  TIEU_DE_TU_CHOI,
  capLaiMatKhauCLB,
  tuChoiCapLaiMatKhau,
} from "@/lib/admin.functions";
import type { ThongBaoCuaToi } from "@/lib/data";
import { ConfirmDialog } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type MoCapLai = { username: string; email: string; maThongBao?: number | undefined };

export const matKhauNgauNhien = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
};

/** Thông báo "Yêu cầu cấp lại mật khẩu": tách tài khoản, email và trạng thái xử lý. */
export function yeuCauCapLai(n: Pick<ThongBaoCuaToi, "TieuDe" | "DuongDan">) {
  if (!n.DuongDan?.startsWith("/admin/clb?capLai=")) return null;
  const q = new URLSearchParams(n.DuongDan.split("?")[1] ?? "");
  const username = q.get("capLai");
  if (!username) return null;
  const trangThai =
    n.TieuDe === TIEU_DE_DA_DUYET ? "duyet" : n.TieuDe === TIEU_DE_TU_CHOI ? "tu-choi" : "cho";
  return { username, email: q.get("email") ?? "", trangThai } as const;
}

/**
 * Nút Duyệt / Từ chối dưới thông báo yêu cầu cấp lại mật khẩu (chuông và trang Thông báo của admin).
 * Đã xử lý thì hiện nhãn trạng thái.
 */
export function HanhDongCapLai({
  n,
  onDuyet,
  className,
}: {
  n: ThongBaoCuaToi;
  onDuyet: (mo: MoCapLai) => void;
  className?: string | undefined;
}) {
  const yc = yeuCauCapLai(n);
  const qc = useQueryClient();
  const tuChoi = useServerFn(tuChoiCapLaiMatKhau);
  const [hoi, setHoi] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!yc) return null;

  if (yc.trangThai !== "cho")
    return (
      <div className={cn("flex", className)}>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold",
            yc.trangThai === "duyet" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {yc.trangThai === "duyet" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {yc.trangThai === "duyet" ? "Đã duyệt" : "Đã từ chối"}
        </span>
      </div>
    );

  const xacNhanTuChoi = async () => {
    setBusy(true);
    try {
      await tuChoi({ data: { maThongBao: n.MaThongBao } });
      toast.success("Đã từ chối yêu cầu của tài khoản " + yc.username);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: ["thong_bao"] });
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        size="sm"
        className="h-8 bg-primary font-bold"
        onClick={() => onDuyet({ username: yc.username, email: yc.email, maThongBao: n.MaThongBao })}
      >
        <Check className="h-4 w-4" /> Duyệt
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        className="h-8 border-destructive/40 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setHoi(true)}
      >
        <X className="h-4 w-4" /> Từ chối
      </Button>
      <ConfirmDialog
        open={hoi}
        onOpenChange={setHoi}
        title={`Từ chối yêu cầu của tài khoản ${yc.username}?`}
        confirmText="Từ chối"
        destructive
        onConfirm={xacNhanTuChoi}
      />
    </div>
  );
}

/**
 * Hộp thoại cấp lại mật khẩu cho tài khoản đại diện CLB.
 * Bấm "Cấp lại & gửi email": đổi mật khẩu, đánh dấu yêu cầu đã duyệt và tự động gửi email cho CLB.
 */
export function CapLaiMatKhauDialog({ mo, onClose }: { mo: MoCapLai | null; onClose: () => void }) {
  const qc = useQueryClient();
  const capLai = useServerFn(capLaiMatKhauCLB);
  const [matKhau, setMatKhau] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [ketQua, setKetQua] = useState<{ loiEmail: string | null } | null>(null);

  const clb = useQuery({
    queryKey: ["tai-khoan-clb", mo?.username],
    enabled: !!mo,
    queryFn: async () => {
      const { data } = await supabase
        .from("nguoi_dung")
        .select("MaCLB, cau_lac_bo!nguoi_dung_MaCLB_fkey(TenCLB)")
        .eq("TenDangNhap", mo!.username)
        .maybeSingle();
      const cl = data?.cau_lac_bo as { TenCLB: string } | { TenCLB: string }[] | null | undefined;
      return { tim: !!data, tenCLB: (Array.isArray(cl) ? cl[0]?.TenCLB : cl?.TenCLB) ?? null };
    },
  });

  useEffect(() => {
    if (!mo) return;
    setMatKhau(matKhauNgauNhien());
    setEmail(mo.email);
    setKetQua(null);
  }, [mo]);

  const emailHopLe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const dangNhapTai = typeof window === "undefined" ? "" : `${window.location.origin}/clb/dang-nhap`;
  const noiDung = () =>
    `Xin chào ${clb.data?.tenCLB ?? ""},\n\nQuản trị viên BAV CLUBS đã cấp lại mật khẩu cho tài khoản của CLB:\n` +
    `- Tên đăng nhập: ${mo?.username ?? ""}\n- Mật khẩu mới: ${matKhau}\n\n` +
    `Đăng nhập tại: ${dangNhapTai}\nSau khi đăng nhập, vui lòng đổi mật khẩu ở trang Hồ sơ.`;

  const submit = async () => {
    if (!mo) return;
    if (matKhau.length < 8) {
      toast.error("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    if (!emailHopLe) {
      toast.error("Email nhận không hợp lệ");
      return;
    }
    setBusy(true);
    try {
      const r = await capLai({
        data: {
          username: mo.username,
          password: matKhau,
          email: email.trim(),
          dangNhapTai,
          ...(mo.maThongBao ? { maThongBao: mo.maThongBao } : {}),
        },
      });
      setKetQua({ loiEmail: r.loiEmail });
      if (r.loiEmail) toast.warning("Đã cấp lại mật khẩu nhưng chưa gửi được email");
      else toast.success("Đã cấp lại mật khẩu và gửi email tới " + email.trim());
      void qc.invalidateQueries({ queryKey: ["thong_bao"] });
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

  const guiThuCong = () => {
    window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
      "BAV CLUBS – Cấp lại mật khẩu tài khoản CLB",
    )}&body=${encodeURIComponent(noiDung())}`;
  };

  return (
    <Dialog open={!!mo} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ketQua ? "Đã cấp lại mật khẩu" : "Cấp lại mật khẩu"}</DialogTitle>
        </DialogHeader>
        {ketQua ? (
          <div className="space-y-3">
            {ketQua.loiEmail ? (
              <div className="flex gap-2 rounded-xl border border-warning bg-warning/15 p-3 text-sm font-semibold">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Chưa gửi được email tự động: {ketQua.loiEmail}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm font-semibold text-success">
                <CheckCircle2 className="h-5 w-5 shrink-0" /> Đã gửi mật khẩu mới tới {email.trim()}
              </div>
            )}
            <div className="space-y-1 rounded-xl border bg-muted p-4 text-sm">
              <div>
                <span className="font-semibold text-muted-foreground">CLB: </span>
                <b>{clb.data?.tenCLB ?? "—"}</b>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Tên đăng nhập: </span>
                <b>{mo?.username}</b>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Mật khẩu mới: </span>
                <b>{matKhau}</b>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copy}>
                <Copy className="h-4 w-4" /> Sao chép
              </Button>
              {ketQua.loiEmail && (
                <Button variant="outline" onClick={guiThuCong}>
                  <Mail className="h-4 w-4" /> Gửi thủ công
                </Button>
              )}
              <Button onClick={onClose} className="bg-primary font-bold">
                Xong
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <O nhan="Câu lạc bộ">
                {clb.isLoading ? "Đang tải..." : clb.data?.tim ? clb.data.tenCLB : "Không tìm thấy tài khoản"}
              </O>
              <O nhan="Tên đăng nhập">
                <KeyRound className="h-4 w-4 text-muted-foreground" /> {mo?.username}
              </O>
              <div className="space-y-1.5">
                <Label>Email nhận mật khẩu *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    maxLength={255}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@vidu.com"
                    className="pl-9"
                  />
                </div>
              </div>
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
                  <Button type="button" variant="outline" className="shrink-0" onClick={() => setMatKhau(matKhauNgauNhien())}>
                    <Dices className="h-4 w-4" /> Ngẫu nhiên
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={busy} onClick={onClose}>
                Hủy
              </Button>
              <Button
                disabled={busy || !clb.data?.tim || !emailHopLe}
                onClick={submit}
                className="bg-primary font-bold"
              >
                <Mail className="h-4 w-4" /> {busy ? "Đang gửi..." : "Cấp lại & gửi email"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function O({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{nhan}</Label>
      <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm font-bold">{children}</div>
    </div>
  );
}

