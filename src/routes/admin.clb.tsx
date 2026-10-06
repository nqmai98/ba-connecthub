import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClubs, type Club } from "@/lib/data";
import { createClubAccount } from "@/lib/admin.functions";
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
      const { data: p } = ids.length ? await supabase.from("profiles").select("id, email").in("id", ids) : { data: [] };
      const map: Record<string, string[]> = {};
      r.forEach((x) => (map[x.club_id] ??= []).push(p?.find((y) => y.id === x.user_id)?.email ?? "?"));
      return map;
    },
  });
  const [target, setTarget] = useState<Club | null>(null);

  return (
    <Page title="Quản lý CLB" subtitle="Cấp tài khoản đăng nhập cho từng câu lạc bộ">
      {isLoading ? <GridSkeleton n={3} /> : !clubs?.length ? <Empty text="Chưa có câu lạc bộ" /> : (
        <div className="space-y-3">
          {clubs.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ClubLogo club={c} size={48} />
                <div className="min-w-0">
                  <div className="truncate font-bold text-primary">{c.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {reps.data?.[c.id]?.length ? "Tài khoản: " + reps.data[c.id].join(", ") : "Chưa có tài khoản"}
                  </div>
                </div>
              </div>
              <Button onClick={() => setTarget(c)} className="shrink-0 rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                <KeyRound className="h-4 w-4" /> Tạo tài khoản
              </Button>
            </div>
          ))}
        </div>
      )}
      <CreateDialog club={target} onClose={() => setTarget(null)} />
    </Page>
  );
}

function CreateDialog({ club, onClose }: { club: Club | null; onClose: () => void }) {
  const create = useServerFn(createClubAccount);
  const qc = useQueryClient();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!club) return;
    if (!form.fullName.trim() || !form.email.trim()) return toast.error("Vui lòng nhập đủ họ tên và email");
    if (form.password.length < 8) return toast.error("Mật khẩu tối thiểu 8 ký tự");
    setBusy(true);
    try {
      await create({ data: { clubId: club.id, ...form } });
      toast.success("Đã tạo tài khoản cho " + club.name);
      qc.invalidateQueries({ queryKey: ["club-reps-admin"] });
      setForm({ fullName: "", email: "", password: "" });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!club} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo tài khoản – {club?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Họ tên người phụ trách</Label><Input value={form.fullName} maxLength={100} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email đăng nhập</Label><Input type="email" value={form.email} maxLength={255} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="clb@hvnh.edu.vn" /></div>
          <div className="space-y-1.5"><Label>Mật khẩu (tối thiểu 8 ký tự)</Label><Input type="text" value={form.password} maxLength={72} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <p className="text-xs font-semibold text-muted-foreground">Gửi email và mật khẩu này cho CLB để họ đăng nhập ở mục "CLB / Quản trị".</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button disabled={busy} onClick={submit} className="bg-primary font-bold">{busy ? "Đang tạo..." : "Tạo tài khoản"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
