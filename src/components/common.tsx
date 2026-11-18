import { useState, type ReactNode } from "react";
import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { Bell, BellOff, Calendar, Inbox, MapPin, Star, Users } from "lucide-react";
import { useAuth, type TenVaiTro } from "@/lib/auth";
import {
  NHAN_LOAI_BAI_DANG,
  NHAN_LOAI_SU_KIEN,
  NHAN_TRANG_THAI_DIEN_RA,
  NHAN_TRANG_THAI_KIEM_DUYET,
  NHAN_TRANG_THAI_XU_LY,
  formatKhoangThoiGian,
  useTheoDoi,
  useToggleTheoDoi,
  useToggleThongBaoTheoDoi,
  useToggleYeuThich,
  useYeuThich,
  type CauLacBo,
  type LoaiBaiDang,
  type LoaiSuKien,
  type SuKien,
  type TrangThaiDienRa,
  type TrangThaiKiemDuyet,
  type TrangThaiXuLy,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Page({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl text-foreground sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm font-medium text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </main>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]", className)}>
      {children}
    </div>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/60" />
      <p className="font-semibold text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export function GridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  );
}

const CHIP = "inline-flex rounded-full px-2.5 py-1 text-xs font-bold";

/** Trạng thái kiểm duyệt của bài đăng (ChoDuyet / DaDuyet / TuChoi). */
export function TrangThaiKiemDuyetBadge({ trangThai }: { trangThai: TrangThaiKiemDuyet }) {
  const cls: Record<TrangThaiKiemDuyet, string> = {
    ChoDuyet: "bg-warning text-warning-foreground",
    DaDuyet: "bg-success text-success-foreground",
    TuChoi: "bg-destructive text-destructive-foreground",
  };
  return <span className={cn(CHIP, cls[trangThai])}>{NHAN_TRANG_THAI_KIEM_DUYET[trangThai]}</span>;
}

/** Trạng thái xử lý của yêu cầu cập nhật thông tin CLB. */
export function TrangThaiXuLyBadge({ trangThai }: { trangThai: TrangThaiXuLy }) {
  const cls: Record<TrangThaiXuLy, string> = {
    ChoDuyet: "bg-warning text-warning-foreground",
    DaDuyet: "bg-success text-success-foreground",
    TuChoi: "bg-destructive text-destructive-foreground",
  };
  return <span className={cn(CHIP, cls[trangThai])}>{NHAN_TRANG_THAI_XU_LY[trangThai]}</span>;
}

/** Trạng thái diễn ra của sự kiện (SapDienRa / DangDienRa / DaDienRa). */
export function TrangThaiDienRaBadge({ trangThai }: { trangThai: TrangThaiDienRa }) {
  const cls: Record<TrangThaiDienRa, string> = {
    SapDienRa: "bg-secondary text-secondary-foreground",
    DangDienRa: "bg-success text-success-foreground",
    DaDienRa: "bg-muted text-muted-foreground",
  };
  return <span className={cn(CHIP, cls[trangThai])}>{NHAN_TRANG_THAI_DIEN_RA[trangThai]}</span>;
}

export function LoaiBaiDangBadge({ loai }: { loai: LoaiBaiDang }) {
  return (
    <span className={cn(CHIP, "bg-secondary text-secondary-foreground")}>
      {NHAN_LOAI_BAI_DANG[loai]}
    </span>
  );
}

export function LoaiSuKienBadge({ loai }: { loai: LoaiSuKien }) {
  return (
    <span
      className={cn(
        CHIP,
        loai === "HocThuat"
          ? "bg-primary text-primary-foreground"
          : "bg-accent text-accent-foreground",
      )}
    >
      {NHAN_LOAI_SU_KIEN[loai]}
    </span>
  );
}

export function ClubLogo({
  club,
  size = 56,
}: {
  club: Pick<CauLacBo, "TenCLB" | "LogoCLB">;
  size?: number;
}) {
  if (club.LogoCLB)
    return (
      <img
        src={club.LogoCLB}
        alt={club.TenCLB}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl border object-cover"
      />
    );
  const initials = club.TenCLB.replace(/^CLB\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground"
    >
      {initials}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Xác nhận",
  onConfirm,
  destructive,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
            onClick={onConfirm}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FollowButton({ maCLB, className }: { maCLB: number; className?: string }) {
  const { maNguoiDung, requireLogin } = useAuth();
  const { data: theoDoi } = useTheoDoi();
  const toggle = useToggleTheoDoi();
  const [confirm, setConfirm] = useState(false);
  const dangTheoDoi = theoDoi?.has(maCLB);
  return (
    <>
      <Button
        size="sm"
        variant={dangTheoDoi ? "outline" : "default"}
        className={cn(
          !dangTheoDoi && "bg-accent font-bold text-accent-foreground hover:bg-accent/90",
          "font-bold",
          className,
        )}
        disabled={toggle.isPending}
        onClick={() => {
          if (!maNguoiDung) return requireLogin();
          if (dangTheoDoi) setConfirm(true);
          else toggle.mutate({ maCLB, theoDoi: true });
        }}
      >
        <Users className="h-4 w-4" />
        {dangTheoDoi ? "Đang theo dõi" : "Theo dõi"}
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Bỏ theo dõi"
        description="Bạn có chắc chắn muốn bỏ theo dõi câu lạc bộ này?"
        confirmText="Bỏ theo dõi"
        destructive
        onConfirm={() => toggle.mutate({ maCLB, theoDoi: false })}
      />
    </>
  );
}

/** Bật/tắt thuộc tính BatThongBao của bảng theo_doi_clb. */
export function NotifyToggle({ maCLB }: { maCLB: number }) {
  const { data: theoDoi } = useTheoDoi();
  const toggle = useToggleThongBaoTheoDoi();
  const row = theoDoi?.get(maCLB);
  if (!row) return null;
  const bat = row.BatThongBao;
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("font-bold", bat ? "border-primary text-primary" : "text-muted-foreground")}
      disabled={toggle.isPending}
      aria-label={bat ? "Tắt thông báo từ câu lạc bộ này" : "Bật thông báo từ câu lạc bộ này"}
      onClick={() => toggle.mutate({ maCLB, bat: !bat })}
    >
      {bat ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      {bat ? "Đang bật thông báo" : "Đã tắt thông báo"}
    </Button>
  );
}

export function FavoriteButton({ maBaiDang }: { maBaiDang: number }) {
  const { maNguoiDung, requireLogin } = useAuth();
  const { data: yeuThich } = useYeuThich();
  const toggle = useToggleYeuThich();
  const [confirm, setConfirm] = useState(false);
  const daLuu = yeuThich?.some((e) => e.MaBaiDang === maBaiDang);
  return (
    <>
      <Button
        size="sm"
        aria-label={daLuu ? "Bỏ yêu thích" : "Yêu thích"}
        className={cn(
          "rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90",
          daLuu && "ring-2 ring-primary",
        )}
        disabled={toggle.isPending}
        onClick={() => {
          if (!maNguoiDung) return requireLogin();
          if (daLuu) setConfirm(true);
          else toggle.mutate({ maBaiDang, yeuThich: true });
        }}
      >
        <Star className={cn("h-4 w-4", daLuu && "fill-current")} />
        {daLuu ? "Đã yêu thích" : "Yêu thích"}
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Bỏ yêu thích sự kiện"
        description="Sự kiện sẽ bị xóa khỏi lịch cá nhân của bạn. Bạn có chắc chắn?"
        confirmText="Bỏ yêu thích"
        destructive
        onConfirm={() => toggle.mutate({ maBaiDang, yeuThich: false })}
      />
    </>
  );
}

export function ClubCard({ club }: { club: CauLacBo }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
      <div className="relative h-28 bg-gradient-to-br from-primary to-primary-dark">
        {club.AnhBia && (
          <img src={club.AnhBia} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        <div className="absolute -bottom-7 left-4 rounded-full border-4 border-card bg-card">
          <ClubLogo club={club} size={56} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-9">
        <h3 className="line-clamp-2 text-base leading-snug text-primary">{club.TenCLB}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
            {club.linh_vuc?.TenLinhVuc ?? "Khác"}
          </span>
          {club.TrangThaiHoatDong === "TamNgung" && (
            <span className="w-fit rounded-full bg-warning px-2.5 py-0.5 text-xs font-bold text-warning-foreground">
              Tạm ngưng
            </span>
          )}
        </div>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
          {club.GioiThieuNgan || club.MoTa}
        </p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <FollowButton maCLB={club.MaCLB} className="w-full rounded-xl" />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-xl border-primary font-bold text-primary"
          >
            <Link to="/cau-lac-bo/$id" params={{ id: String(club.MaCLB) }}>
              Xem chi tiết
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EventCard({ suKien }: { suKien: SuKien }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] sm:flex-row">
      <div className="h-40 shrink-0 bg-gradient-to-br from-primary to-primary-dark sm:h-auto sm:w-2/5">
        {suKien.AnhBia ? (
          <img
            src={suKien.AnhBia}
            alt={suKien.TieuDe}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center text-lg font-extrabold text-primary-foreground">
            {suKien.cau_lac_bo?.TenCLB}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 border-l-0 p-4 sm:border-l-4 sm:border-l-primary">
        <div className="flex flex-wrap gap-1.5">
          <LoaiSuKienBadge loai={suKien.LoaiSuKien} />
          <TrangThaiDienRaBadge trangThai={suKien.TrangThaiDienRa} />
        </div>
        <h3 className="text-lg leading-snug text-primary">{suKien.TieuDe}</h3>
        <p className="line-clamp-2 text-sm italic text-muted-foreground">{suKien.NoiDung}</p>
        <div className="space-y-1 text-sm font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            {formatKhoangThoiGian(suKien.ThoiGianBatDau, suKien.ThoiGianKetThuc)}
          </div>
          {suKien.DiaDiem && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              {suKien.DiaDiem}
            </div>
          )}
          {suKien.cau_lac_bo && (
            <Link
              to="/cau-lac-bo/$id"
              params={{ id: String(suKien.cau_lac_bo.MaCLB) }}
              className="flex items-center gap-2 hover:text-primary"
            >
              <Users className="h-4 w-4 shrink-0 text-primary" />
              Đơn vị tổ chức: {suKien.cau_lac_bo.TenCLB}
            </Link>
          )}
        </div>
        <div className="mt-auto flex justify-end pt-2">
          <FavoriteButton maBaiDang={suKien.MaBaiDang} />
        </div>
      </div>
    </div>
  );
}

export function RoleGate({
  vaiTro: canThiet,
  children,
}: {
  vaiTro?: TenVaiTro[];
  children: ReactNode;
}) {
  const { ready, maNguoiDung, vaiTro } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!ready)
    return (
      <main className="mx-auto max-w-7xl space-y-4 px-3 py-8 sm:px-6">
        <Skeleton className="h-10 w-64" />
        <GridSkeleton n={3} />
      </main>
    );
  // Mỗi khu có trang đăng nhập riêng: /admin/dang-nhap, /dang-nhap-clb, /dang-nhap
  if (!maNguoiDung)
    return (
      <Navigate
        to={
          /^\/admin(\/|$)/.test(pathname)
            ? "/admin/dang-nhap"
            : /^\/clb(\/|$)/.test(pathname)
              ? "/clb/dang-nhap"
              : "/dang-nhap"
        }
      />
    );
  if (canThiet && (!vaiTro || !canThiet.includes(vaiTro)))
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Empty
          text="Bạn không có quyền truy cập trang này."
          action={
            <Button asChild>
              <Link to="/">Về trang chủ</Link>
            </Button>
          }
        />
      </main>
    );
  return <>{children}</>;
}
