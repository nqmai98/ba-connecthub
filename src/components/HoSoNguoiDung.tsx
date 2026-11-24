import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  CalendarHeart,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { doiEmailAdmin } from "@/lib/admin.functions";
import { NHAN_VAI_TRO, homePath, useAuth } from "@/lib/auth";
import { formatDateTime, useThongBao, useTheoDoi, useYeuThich } from "@/lib/data";
import { CLUB_EMAIL_DOMAIN, emailToUsername } from "@/lib/club-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (bỏ qua khoảng trắng, dấu chấm). */
const chuanHoaSDT = (s: string) => s.replace(/[\s.-]/g, "");
const sdtHopLe = (s: string) => /^(0|\+84)\d{9}$/.test(chuanHoaSDT(s));

/**
 * Trang hồ sơ tài khoản dùng chung cho khu Sinh viên (/ho-so), Đại diện CLB (/clb/ho-so) và Quản trị (/admin/ho-so).
 * Ở khu Quản trị: không có ô thống kê theo dõi/yêu thích, đăng xuất quay về /admin/dang-nhap.
 */
export function HoSoNguoiDung({ khu = "sinh-vien" }: { khu?: "sinh-vien" | "clb" | "admin" }) {
  const { nguoiDung, vaiTro, session, refresh, signOut, biKhoa } = useAuth();
  const navigate = useNavigate();
  const { data: theoDoi } = useTheoDoi();
  const { data: yeuThich } = useYeuThich();
  const { data: thongBao } = useThongBao();

  const [hoTen, setHoTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [loi, setLoi] = useState<{ hoTen?: string; sdt?: string }>({});
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    setHoTen(nguoiDung?.HoTen ?? "");
    setSdt(nguoiDung?.SoDienThoai ?? "");
  }, [nguoiDung?.HoTen, nguoiDung?.SoDienThoai]);

  if (!nguoiDung) return null;
  const laGoogle = session?.user.app_metadata?.["provider"] === "google";
  // Tài khoản CLB đăng nhập bằng username; hệ thống đăng nhập bắt buộc có email nên username được
  // ghép với tên miền nội bộ "@clb.baclubs.local" (không phải email thật) – xem lib/club-account.ts.
  const laTaiKhoanCLB = nguoiDung.EmailTruong.toLowerCase().endsWith(CLUB_EMAIL_DOMAIN);
  const tenDangNhap = laTaiKhoanCLB ? emailToUsername(nguoiDung.EmailTruong) : nguoiDung.EmailTruong;

  const anhDaiDien = session?.user.user_metadata?.["avatar_url"] as string | undefined;
  const tenHienThi = nguoiDung.HoTen || nguoiDung.TenDangNhap || tenDangNhap;
  const chuCai = tenHienThi
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const coThayDoi =
    hoTen.trim() !== (nguoiDung.HoTen ?? "") || chuanHoaSDT(sdt) !== (nguoiDung.SoDienThoai ?? "");
  const sapToi = (yeuThich ?? []).filter((e) => new Date(e.ThoiGianKetThuc) >= new Date()).length;
  const chuaDoc = (thongBao ?? []).filter((n) => !n.DaDoc).length;

  const luu = async () => {
    const e: { hoTen?: string; sdt?: string } = {};
    if (!hoTen.trim()) e.hoTen = "Vui lòng nhập họ tên";
    if (sdt.trim() && !sdtHopLe(sdt)) e.sdt = "Số điện thoại không hợp lệ (VD: 0912345678)";
    setLoi(e);
    if (e.hoTen || e.sdt) return;
    setDangLuu(true);
    const { error } = await supabase
      .from("nguoi_dung")
      .update({ HoTen: hoTen.trim().slice(0, 100), SoDienThoai: sdt.trim() ? chuanHoaSDT(sdt) : null })
      .eq("MaNguoiDung", nguoiDung.MaNguoiDung);
    setDangLuu(false);
    if (error) {
      toast.error("Lưu thất bại, vui lòng thử lại");
      return;
    }
    await refresh();
    toast.success("Đã cập nhật hồ sơ");
  };

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8">
      {/* Thẻ đầu trang hồ sơ */}
      <section className="bg-galaxy overflow-hidden rounded-3xl text-white shadow-[0_18px_50px_-24px_rgb(31_35_95/0.7)]">
        <div className="galaxy-stars" aria-hidden />
        <div className="relative flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
          {anhDaiDien ? (
            <img
              src={anhDaiDien}
              alt=""
              referrerPolicy="no-referrer"
              className="h-24 w-24 shrink-0 rounded-full border-4 border-white/30 object-cover"
            />
          ) : (
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-white/30 bg-accent text-3xl font-extrabold text-accent-foreground">
              {chuCai}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl sm:text-3xl">{tenHienThi}</h1>
            <p className="mt-1 truncate font-semibold text-white/75">{tenDangNhap}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-extrabold text-accent-foreground">
                {vaiTro ? NHAN_VAI_TRO[vaiTro] : "Người dùng"}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  biKhoa ? "bg-destructive text-destructive-foreground" : "bg-white/15",
                )}
              >
                {biKhoa ? "Tài khoản bị khóa" : "Đang hoạt động"}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                Tham gia {new Date(nguoiDung.NgayCapTaiKhoan).toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>
          {khu === "sinh-vien" && vaiTro && vaiTro !== "SinhVien" && (
            <Button asChild className="bg-white font-bold text-primary hover:bg-white/90">
              <Link to={homePath(vaiTro)}>Về trang quản lý</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Hoạt động của tôi */}
      {khu === "sinh-vien" && vaiTro === "SinhVien" && (
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ThongKe icon={Users} nhan="CLB đang theo dõi" so={theoDoi?.size ?? 0} to="/dang-theo-doi" />
          <ThongKe
            icon={CalendarHeart}
            nhan="Sự kiện đã yêu thích"
            so={yeuThich?.length ?? 0}
            phu={sapToi ? `${sapToi} sự kiện sắp diễn ra` : undefined}
            to="/lich-ca-nhan"
          />
          <ThongKe icon={Bell} nhan="Thông báo chưa đọc" so={chuaDoc} to="/thong-bao" />
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Thông tin cá nhân – chỉnh được Họ tên và Số điện thoại */}
        <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <h2 className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5 text-primary" /> Thông tin cá nhân
          </h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ho-ten">Họ và tên *</Label>
              <Input
                id="ho-ten"
                value={hoTen}
                maxLength={100}
                onChange={(e) => setHoTen(e.target.value)}
                className={cn(loi.hoTen && "border-destructive")}
              />
              {loi.hoTen && <p className="text-sm font-semibold text-destructive">{loi.hoTen}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sdt">Số điện thoại</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="sdt"
                  type="tel"
                  inputMode="tel"
                  value={sdt}
                  maxLength={15}
                  placeholder="VD: 0912345678"
                  onChange={(e) => setSdt(e.target.value)}
                  className={cn("pl-9", loi.sdt && "border-destructive")}
                />
              </div>
              {loi.sdt && <p className="text-sm font-semibold text-destructive">{loi.sdt}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{laTaiKhoanCLB ? "Tên đăng nhập" : laGoogle ? "Email trường" : "Email đăng nhập"}</Label>
              <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                {laTaiKhoanCLB ? <UserRound className="h-4 w-4 shrink-0" /> : <Mail className="h-4 w-4 shrink-0" />}
                <span className="truncate">{tenDangNhap}</span>
              </div>
              {khu === "admin" && !laGoogle && !laTaiKhoanCLB && <DoiEmail emailHienTai={nguoiDung.EmailTruong} />}
              {!laTaiKhoanCLB && khu !== "admin" && (
                <p className="text-xs font-medium text-muted-foreground">
                  {laGoogle
                    ? "Email gắn với tài khoản Google của trường nên không thay đổi được."
                    : "Email đăng nhập do Quản trị viên quản lý nên không đổi được tại đây."}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={!coThayDoi || dangLuu}
              onClick={() => {
                setHoTen(nguoiDung.HoTen ?? "");
                setSdt(nguoiDung.SoDienThoai ?? "");
                setLoi({});
              }}
            >
              Hủy thay đổi
            </Button>
            <Button disabled={!coThayDoi || dangLuu} onClick={luu} className="bg-primary font-bold">
              {dangLuu ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </section>

        {/* Thông tin tài khoản – chỉ xem */}
        <section className="h-fit rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <h2 className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" /> Tài khoản
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Dong nhan="Vai trò" giaTri={vaiTro ? NHAN_VAI_TRO[vaiTro] : "—"} />
            {nguoiDung.TenDangNhap && <Dong nhan="Tên đăng nhập" giaTri={nguoiDung.TenDangNhap} />}
            <Dong nhan="Trạng thái" giaTri={biKhoa ? "Bị khóa" : "Đang hoạt động"} />
            <Dong nhan="Ngày tạo tài khoản" giaTri={formatDateTime(nguoiDung.NgayCapTaiKhoan)} />
            <Dong
              nhan="Đăng nhập bằng"
              giaTri={laGoogle ? "Google" : "Email & mật khẩu"}
            />
          </dl>
          {!laGoogle && <DoiMatKhau />}
          <Button
            variant="outline"
            className="mt-6 w-full font-bold text-destructive hover:text-destructive"
            onClick={async () => {
              await signOut();
              navigate({
                to: khu === "admin" ? "/admin/dang-nhap" : khu === "clb" ? "/clb/dang-nhap" : "/dang-nhap",
                replace: true,
              });
            }}
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </section>
      </div>
    </main>
  );
}

function ThongKe({
  icon: Icon,
  nhan,
  so,
  phu,
  to,
}: {
  icon: LucideIcon;
  nhan: string;
  so: number;
  phu?: string | undefined;
  to: "/dang-theo-doi" | "/lich-ca-nhan" | "/thong-bao";
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-extrabold text-primary">{so}</span>
        <span className="block text-sm font-semibold text-muted-foreground">{nhan}</span>
        {phu && <span className="block text-xs font-bold text-accent-foreground/80">{phu}</span>}
      </span>
    </Link>
  );
}

function Dong({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
      <dt className="font-semibold text-muted-foreground">{nhan}</dt>
      <dd className="text-right font-bold">{giaTri}</dd>
    </div>
  );
}

/**
 * Đổi mật khẩu – chỉ cho tài khoản đăng nhập bằng email + mật khẩu (Quản trị viên, Đại diện CLB).
 * Lovable Cloud bật "yêu cầu mật khẩu hiện tại khi đổi mật khẩu", nên phải nhập mật khẩu hiện tại:
 * kiểm tra trước bằng cách đăng nhập lại, rồi gửi kèm current_password khi cập nhật.
 */
function DoiMatKhau() {
  const { session } = useAuth();
  const [mo, setMo] = useState(false);
  const [cu, setCu] = useState("");
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [loi, setLoi] = useState("");
  const [busy, setBusy] = useState(false);

  const dong = () => {
    setMo(false);
    setCu("");
    setMk("");
    setMk2("");
    setLoi("");
  };

  const luu = async () => {
    if (!cu) {
      setLoi("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (mk.length < 8) {
      setLoi("Mật khẩu mới tối thiểu 8 ký tự");
      return;
    }
    if (mk !== mk2) {
      setLoi("Hai mật khẩu mới không khớp");
      return;
    }
    if (mk === cu) {
      setLoi("Mật khẩu mới phải khác mật khẩu hiện tại");
      return;
    }
    const email = session?.user.email;
    if (!email) {
      setLoi("Không xác định được tài khoản, vui lòng đăng nhập lại");
      return;
    }
    setBusy(true);
    // 1) Kiểm tra mật khẩu hiện tại
    const kiemTra = await supabase.auth.signInWithPassword({ email, password: cu });
    if (kiemTra.error) {
      setBusy(false);
      setLoi("Mật khẩu hiện tại không đúng");
      return;
    }
    // 2) Đổi mật khẩu, gửi kèm mật khẩu hiện tại theo yêu cầu của máy chủ
    const { error } = await supabase.auth.updateUser({
      password: mk,
      current_password: cu,
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    setBusy(false);
    if (error) {
      setLoi("Đổi mật khẩu thất bại: " + error.message);
      return;
    }
    toast.success("Đã đổi mật khẩu");
    dong();
  };

  if (!mo)
    return (
      <Button variant="outline" className="mt-5 w-full font-bold" onClick={() => setMo(true)}>
        <KeyRound className="h-4 w-4" /> Đổi mật khẩu
      </Button>
    );
  return (
    <div className="mt-5 space-y-3 rounded-xl border p-3">
      <O id="mk-cu" nhan="Mật khẩu hiện tại" value={cu} autoComplete="current-password" onChange={(v) => { setCu(v); setLoi(""); }} />
      <O id="mk-moi" nhan="Mật khẩu mới" value={mk} autoComplete="new-password" onChange={(v) => { setMk(v); setLoi(""); }} />
      <O id="mk-lai" nhan="Nhập lại mật khẩu mới" value={mk2} autoComplete="new-password" onChange={(v) => { setMk2(v); setLoi(""); }} />
      {loi && <p className="text-sm font-semibold text-destructive">{loi}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={dong}>
          Hủy
        </Button>
        <Button size="sm" disabled={busy} className="bg-primary font-bold" onClick={luu}>
          {busy ? "Đang lưu..." : "Lưu mật khẩu"}
        </Button>
      </div>
    </div>
  );
}

/** Ô mật khẩu có nút hiện / ẩn. */
/** Quản trị viên đổi email đăng nhập: nhập email mới + mật khẩu hiện tại để xác nhận. */
function DoiEmail({ emailHienTai }: { emailHienTai: string }) {
  const { refresh } = useAuth();
  const doiEmail = useServerFn(doiEmailAdmin);
  const [mo, setMo] = useState(false);
  const [email, setEmail] = useState("");
  const [mk, setMk] = useState("");
  const [loi, setLoi] = useState("");
  const [busy, setBusy] = useState(false);

  const dong = () => {
    setMo(false);
    setEmail("");
    setMk("");
    setLoi("");
  };

  const luu = async () => {
    const moi = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(moi)) {
      setLoi("Email mới không hợp lệ");
      return;
    }
    if (moi === emailHienTai.toLowerCase()) {
      setLoi("Email mới phải khác email hiện tại");
      return;
    }
    if (!mk) {
      setLoi("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    setBusy(true);
    const kiemTra = await supabase.auth.signInWithPassword({ email: emailHienTai, password: mk });
    if (kiemTra.error) {
      setBusy(false);
      setLoi("Mật khẩu hiện tại không đúng");
      return;
    }
    try {
      await doiEmail({ data: { email: moi } });
      await supabase.auth.refreshSession();
      await refresh();
      toast.success("Đã đổi email đăng nhập thành " + moi);
      dong();
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!mo)
    return (
      <Button type="button" variant="outline" size="sm" className="font-bold" onClick={() => setMo(true)}>
        <Mail className="h-4 w-4" /> Đổi email
      </Button>
    );
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="email-moi" className="font-bold">
          Email mới
        </Label>
        <Input
          id="email-moi"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
          maxLength={255}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setLoi("");
          }}
          placeholder="email@vidu.com"
        />
      </div>
      <O
        id="mk-xac-nhan-email"
        nhan="Mật khẩu hiện tại"
        value={mk}
        autoComplete="current-password"
        onChange={(v) => {
          setMk(v);
          setLoi("");
        }}
      />
      {loi && <p className="text-sm font-semibold text-destructive">{loi}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={dong}>
          Hủy
        </Button>
        <Button size="sm" disabled={busy} className="bg-primary font-bold" onClick={luu}>
          {busy ? "Đang lưu..." : "Lưu email"}
        </Button>
      </div>
    </div>
  );
}

function O({
  id,
  nhan,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  nhan: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [hien, setHien] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-bold">
        {nhan}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={hien ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          maxLength={72}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          title={hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setHien((v) => !v)}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {hien ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
