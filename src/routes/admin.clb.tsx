import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Dices, KeyRound, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClubs, type Club } from "@/lib/data";
import { createClubAccount, deleteClub } from "@/lib/admin.functions";
import { USERNAME_HINT, USERNAME_REGEX } from "@/lib/club-account";
import { ClubLogo, Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/clb")({
  head: () => ({
    meta: [
      { title: "Quản lý CLB – BA CLUBS" },
      { name: "description", content: "Quản lý câu lạc bộ và cấp tài khoản cho đại diện CLB." },
      { property: "og:title", content: "Quản lý CLB – BA CLUBS" },
      { property: "og:description", content: "Quản lý câu lạc bộ và cấp tài khoản cho đại diện CLB." },
    ],
  }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <ManageClubs />
    </RoleGate>
  ),
});

function ManageClubs() {
  const { data: clubs, isLoading } = useClubs();
  const reps = useQuery({
    queryKey: ["club-reps-admin"],
    queryFn: async () => {
      const { data: r, error } = await supabase.from("club_reps").select("club_id, user_id");
      if (error) throw error;
      const ids = r.map((x) => x.user_id);
      const { data: p } = ids.length ? await supabase.from("profiles").select("id, email, username").in("id", ids) : { data: [] };
      const map: Record<string, string[]> = {};
      r.forEach((x) => (map[x.club_id] ??= []).push((() => { const u = p?.find((y) => y.id === x.user_id); return u?.username ?? u?.email ?? "?"; })()));
      return map;
    },
  });
  // undefined: đóng · null: tạo CLB mới · Club: cấp tài khoản cho CLB có sẵn
  const [target, setTarget] = useState<Club | null | undefined>(undefined);
  const [fresh, setFresh] = useState<string | null>(null); // CLB vừa tạo: đưa lên đầu, tô nổi bật
  const [toDelete, setToDelete] = useState<Club | null>(null);
  const list = clubs && fresh ? [...clubs.filter((c) => c.id === fresh), ...clubs.filter((c) => c.id !== fresh)] : clubs;

  useEffect(() => {
    if (fresh) document.getElementById("club-" + fresh)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [fresh, clubs]);

  return (
    <Page
      title="Quản lý CLB"
      subtitle="Tạo CLB và cấp tài khoản đăng nhập cho từng câu lạc bộ"
      actions={<Button onClick={() => setTarget(null)} className="rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> Tạo tài khoản CLB</Button>}
    >
      {isLoading ? <GridSkeleton n={3} /> : !clubs?.length ? <Empty text="Chưa có câu lạc bộ" /> : (
        <div className="space-y-3">
          {list!.map((c) => (
            <div key={c.id} id={"club-" + c.id} className={"flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center " + (c.id === fresh ? "border-accent ring-2 ring-accent/60" : "")}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ClubLogo club={c} size={48} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="truncate font-bold text-primary">{c.name}</span>{c.id === fresh && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-extrabold text-accent-foreground">Vừa tạo</span>}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {reps.data?.[c.id]?.length ? "Tài khoản (username): " + reps.data[c.id]!.join(", ") : "Chưa có tài khoản"}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button onClick={() => setTarget(c)} className="rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                  <KeyRound className="h-4 w-4" /> Cấp tài khoản
                </Button>
                <Button variant="outline" onClick={() => setToDelete(c)} className="rounded-xl border-destructive/40 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" /> Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <CreateDialog target={target} onClose={() => setTarget(undefined)} onCreated={setFresh} />
      <DeleteDialog club={toDelete} accounts={toDelete ? reps.data?.[toDelete.id] ?? [] : []} onClose={() => setToDelete(null)} onDeleted={(id) => setFresh((f) => (f === id ? null : f))} />
    </Page>
  );
}

const randomPassword = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
};

function CreateDialog({ target, onClose, onCreated }: { target: Club | null | undefined; onClose: () => void; onCreated: (clubId: string) => void }) {
  const create = useServerFn(createClubAccount);
  const qc = useQueryClient();
  const open = target !== undefined;
  const existing = target ?? null;
  const [form, setForm] = useState({ clubName: "", username: "", password: "" });
  const [done, setDone] = useState<{ clubName: string; username: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setForm({ clubName: existing?.name ?? "", username: "", password: "" }); setDone(null); }
  }, [open, existing]);

  const submit = async () => {
    const username = form.username.trim().toLowerCase();
    if (form.clubName.trim().length < 2) { toast.error("Vui lòng nhập tên đầy đủ CLB"); return; }
    if (!USERNAME_REGEX.test(username)) { toast.error("Username không hợp lệ: " + USERNAME_HINT); return; }
    if (form.password.length < 8) { toast.error("Mật khẩu tối thiểu 8 ký tự"); return; }
    setBusy(true);
    try {
      const res = await create({ data: { clubId: existing?.id, clubName: form.clubName.trim(), username, password: form.password } });
      toast.success("Đã tạo tài khoản cho " + form.clubName.trim());
      // Làm mới danh sách ngay để CLB vừa tạo (kèm tài khoản) hiện sẵn trong trang Quản lý CLB
      await Promise.all([
        qc.refetchQueries({ queryKey: ["clubs"] }),
        qc.refetchQueries({ queryKey: ["club-reps-admin"] }),
        qc.invalidateQueries({ queryKey: ["admin-accounts"] }),
      ]);
      onCreated(res.clubId);
      setDone({ clubName: form.clubName.trim(), username, password: form.password });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!done) return;
    try {
      await navigator.clipboard.writeText(`CLB: ${done.clubName}\nTên đăng nhập: ${done.username}\nMật khẩu: ${done.password}`);
      toast.success("Đã sao chép thông tin đăng nhập");
    } catch { toast.error("Không thể sao chép, hãy chép thủ công"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{done ? "Tạo tài khoản thành công" : existing ? "Cấp tài khoản – " + existing.name : "Tạo tài khoản CLB mới"}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="space-y-3">
            <div className="space-y-1 rounded-xl border bg-muted p-4 text-sm">
              <div><span className="font-semibold text-muted-foreground">CLB: </span><b>{done.clubName}</b></div>
              <div><span className="font-semibold text-muted-foreground">Tên đăng nhập: </span><b>{done.username}</b></div>
              <div><span className="font-semibold text-muted-foreground">Mật khẩu: </span><b>{done.password}</b></div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">Mật khẩu chỉ hiển thị một lần này. Hãy gửi cho CLB; họ đăng nhập ở tab "CLB / Quản trị".</p>
            <DialogFooter>
              <Button variant="outline" onClick={copy}><Copy className="h-4 w-4" /> Sao chép</Button>
              <Button onClick={onClose} className="bg-primary font-bold">Xong</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Tên đầy đủ CLB *</Label>
                <Input value={form.clubName} maxLength={150} disabled={!!existing} onChange={(e) => setForm({ ...form, clubName: e.target.value })} placeholder="VD: CLB Tiếng Anh BA English" />
              </div>
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input value={form.username} maxLength={30} autoCapitalize="none" autoComplete="off" onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="VD: baenglish" />
                <p className="text-xs font-medium text-muted-foreground">{USERNAME_HINT}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Mật khẩu * (tối thiểu 8 ký tự)</Label>
                <div className="flex gap-2">
                  <Input type="text" value={form.password} maxLength={72} autoComplete="off" onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <Button type="button" variant="outline" className="shrink-0" onClick={() => setForm({ ...form, password: randomPassword() })}><Dices className="h-4 w-4" /> Ngẫu nhiên</Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Hủy</Button>
              <Button disabled={busy} onClick={submit} className="bg-primary font-bold">{busy ? "Đang tạo..." : "Tạo tài khoản"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ club, accounts, onClose, onDeleted }: { club: Club | null; accounts: string[]; onClose: () => void; onDeleted: (clubId: string) => void }) {
  const remove = useServerFn(deleteClub);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!club) return;
    setBusy(true);
    try {
      await remove({ data: { clubId: club.id } });
      toast.success("Đã xóa hồ sơ " + club.name);
      onDeleted(club.id);
      await qc.invalidateQueries(); // làm mới mọi danh sách (CLB, bài đăng, sự kiện, tài khoản...)
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
          <DialogTitle>Xóa hồ sơ {club?.name}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm font-medium">
          <p>Thao tác này <b className="text-destructive">không thể hoàn tác</b>. Sẽ xóa vĩnh viễn:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Hồ sơ CLB và toàn bộ bài đăng, sự kiện của CLB</li>
            <li>Lượt theo dõi CLB và lượt yêu thích sự kiện của CLB</li>
            <li>{accounts.length ? "Tài khoản đăng nhập: " + accounts.join(", ") : "Tài khoản đăng nhập của CLB (nếu có)"}</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>Hủy</Button>
          <Button disabled={busy} onClick={confirm} className="bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90">
            <Trash2 className="h-4 w-4" /> {busy ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
