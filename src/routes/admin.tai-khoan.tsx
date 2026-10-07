import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { ROLE_LABEL, primaryRole, useAuth, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/tai-khoan")({
  head: () => ({ meta: [{ title: "Quản lý tài khoản – BA CLUBS" }, { name: "description", content: "Quản lý vai trò và trạng thái tài khoản người dùng." }, { property: "og:title", content: "Quản lý tài khoản – BA CLUBS" }, { property: "og:description", content: "Quản lý vai trò và trạng thái tài khoản người dùng." }] }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <Accounts />
    </RoleGate>
  ),
});

function Accounts() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, is_locked").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      return (p.data ?? []).map((u) => ({ ...u, role: primaryRole((r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role as Role)) }));
    },
  });

  const changeRole = async (id: string, role: Role) => {
    const ins = await supabase.from("user_roles").insert({ user_id: id, role });
    if (ins.error && !ins.error.message.includes("duplicate")) { toast.error("Đổi vai trò thất bại: " + ins.error.message); return; }
    const del = await supabase.from("user_roles").delete().eq("user_id", id).neq("role", role);
    if (del.error) { toast.error("Đổi vai trò thất bại: " + del.error.message); return; }
    toast.success("Đã đổi vai trò thành " + ROLE_LABEL[role]);
    qc.invalidateQueries({ queryKey: ["admin-accounts"] });
  };
  const toggleLock = async (id: string, lock: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_locked: lock }).eq("id", id);
    if (error) { toast.error("Thao tác thất bại: " + error.message); return; }
    toast.success(lock ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
    qc.invalidateQueries({ queryKey: ["admin-accounts"] });
  };

  const rows = q.data?.filter((u) => (u.full_name + u.email).toLowerCase().includes(search.toLowerCase()));
  return (
    <Page title="Quản lý tài khoản" actions={<Input className="w-64" placeholder="Tìm theo tên hoặc email" value={search} onChange={(e) => setSearch(e.target.value)} />}>
      {q.isLoading ? <GridSkeleton n={3} /> : !rows?.length ? <Empty text="Không có tài khoản" /> : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-muted text-left font-bold"><tr><th className="p-3">Họ tên</th><th className="p-3">Email</th><th className="p-3">Vai trò</th><th className="p-3">Trạng thái</th><th className="p-3"></th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-semibold">{u.full_name || "—"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <select disabled={u.id === userId} className="h-9 rounded-md border bg-background px-2" value={u.role} onChange={(e) => changeRole(u.id, e.target.value as Role)}>
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td className="p-3">{u.is_locked ? <span className="font-bold text-destructive">Đã khóa</span> : <span className="font-bold text-success">Hoạt động</span>}</td>
                  <td className="p-3 text-right">{u.id !== userId && <Button size="sm" variant="outline" onClick={() => toggleLock(u.id, !u.is_locked)}>{u.is_locked ? "Mở khóa" : "Khóa"}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
