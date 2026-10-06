import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, GridSkeleton, Page, RoleGate, StatusBadge } from "@/components/common";
import { PostForm } from "@/components/forms";
import { useAuth } from "@/lib/auth";
import { formatDateTime, type Post } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/clb/bai-dang")({
  head: () => ({ meta: [{ title: "Bài đăng của tôi – BA CLUBS" }, { name: "description", content: "Theo dõi trạng thái duyệt các bài đăng của CLB." }, { property: "og:title", content: "Bài đăng của tôi – BA CLUBS" }, { property: "og:description", content: "Theo dõi trạng thái duyệt các bài đăng của CLB." }] }),
  component: () => (
    <RoleGate roles={["club_rep"]}>
      <MyPosts />
    </RoleGate>
  ),
});

function MyPosts() {
  const { clubIds } = useAuth();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Post | null>(null);
  const q = useQuery({
    queryKey: ["my-posts", clubIds],
    enabled: clubIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").in("club_id", clubIds).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });
  return (
    <Page title="Bài đăng của tôi" actions={<Button asChild className="bg-accent font-bold text-accent-foreground hover:bg-accent/90"><Link to="/clb/dang-bai"><Plus className="h-4 w-4" /> Tạo bài đăng / sự kiện</Link></Button>}>
      {q.isLoading ? <GridSkeleton n={3} /> : !q.data?.length ? <Empty text="Chưa có bài đăng nào" /> : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-left font-bold"><tr><th className="p-3">Tiêu đề</th><th className="p-3">Loại</th><th className="p-3">Ngày gửi</th><th className="p-3">Trạng thái</th><th className="p-3"></th></tr></thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="p-3 font-semibold">{p.title}{p.status === "rejected" && p.reject_reason && <div className="mt-1 text-xs font-medium text-destructive">Lý do: {p.reject_reason}</div>}</td>
                  <td className="p-3">{p.type === "event" ? "Sự kiện" : "Tin tức"}</td>
                  <td className="p-3 text-muted-foreground">{formatDateTime(p.created_at)}</td>
                  <td className="p-3"><StatusBadge status={p.status} /></td>
                  <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setEdit(p)}><Pencil className="h-3.5 w-3.5" /> {p.status === "rejected" ? "Sửa & gửi lại" : "Sửa"}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Chỉnh sửa bài đăng</DialogTitle></DialogHeader>
          {edit && <PostForm clubId={edit.club_id} initial={edit} onCancel={() => setEdit(null)} onDone={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["my-posts"] }); }} />}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
