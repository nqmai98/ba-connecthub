import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck, UsersRound } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import { requestClubPasswordReset } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/clb/quen-mat-khau")({
  head: () => ({
    meta: [
      { title: "Quên mật khẩu – Đại diện CLB BAV CLUBS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuenMatKhauCLB,
});

/** Đại diện CLB quên mật khẩu: gửi yêu cầu để Quản trị viên cấp lại và gửi qua email. */
function QuenMatKhauCLB() {
  const gui = useServerFn(requestClubPasswordReset);
  const [f, setF] = useState({ username: "", clubName: "", email: "" });
  const [loi, setLoi] = useState("");
  const [busy, setBusy] = useState(false);
  const [daGui, setDaGui] = useState(false);

  const set = (k: keyof typeof f, v: string) => {
    setF({ ...f, [k]: v });
    setLoi("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.username.trim() || !f.clubName.trim() || !f.email.trim()) {
      setLoi("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      setLoi("Email không hợp lệ");
      return;
    }
    setBusy(true);
    try {
      await gui({ data: f });
      setDaGui(true);
    } catch (err) {
      setLoi((err as Error).message || "Gửi yêu cầu thất bại, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5fb] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo.url} alt="Logo Học viện Ngân hàng" className="h-20 w-auto" />
          <h1 className="mt-3 text-2xl text-primary">Quên mật khẩu</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground">
            <ShieldCheck className="h-4 w-4" /> Cổng dành cho Đại diện CLB
          </span>
        </div>

        {daGui ? (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <div>
              <p className="text-lg font-extrabold text-foreground">Đã gửi yêu cầu</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Mật khẩu mới sẽ được gửi tới <b className="text-foreground">{f.email.trim()}</b>.
              </p>
            </div>
            <Button asChild className="h-11 w-full rounded-xl bg-primary text-base font-extrabold">
              <Link to="/clb/dang-nhap">Quay lại đăng nhập</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <O id="username" nhan="Tên tài khoản" icon={KeyRound}>
              <Input
                id="username"
                autoCapitalize="none"
                autoComplete="username"
                maxLength={64}
                value={f.username}
                onChange={(e) => set("username", e.target.value.toLowerCase())}
                placeholder="VD: sec.hvnh"
                className="h-11 pl-9"
              />
            </O>
            <O id="clubName" nhan="Tên CLB" icon={UsersRound}>
              <Input
                id="clubName"
                maxLength={255}
                value={f.clubName}
                onChange={(e) => set("clubName", e.target.value)}
                placeholder="VD: CLB Chứng khoán SEC"
                className="h-11 pl-9"
              />
            </O>
            <O id="email" nhan="Email CLB" icon={Mail}>
              <Input
                id="email"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                maxLength={255}
                value={f.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@vidu.com"
                className="h-11 pl-9"
              />
            </O>
            {loi && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {loi}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground hover:bg-primary-dark"
            >
              {busy ? "Đang gửi..." : "Gửi yêu cầu cấp lại mật khẩu"}
            </Button>
            <Link
              to="/clb/dang-nhap"
              className="flex items-center justify-center gap-1.5 text-sm font-bold text-primary underline-offset-2 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}

function O({
  id,
  nhan,
  icon: Icon,
  children,
}: {
  id: string;
  nhan: string;
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-bold">
        {nhan} *
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
