import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, ConfirmDialog, Empty, GridSkeleton, Page, RoleGate, StatusBadge } from "@/components/common";
import { formatDateTime, type Post } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/duyet-bai")({
  head: () => ({ meta: [{ title: "Duyệt bài – BA CLUBS" }, { name: "description", content: "Duyệt bài đăng do các CLB gửi lên." }, { property: "og:title", content: "Duyệt bài – BA CLUBS" }, { property: "og:description", content: "Duyệt bài đăng do các CLB gửi lên." }] }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <Review />
    </RoleGate>
  ),
});

function Review() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["pending-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*, clubs(id, name, logo_url)").eq("status", "pending").order("created_at");
      if (error) throw error;
      return data as Post[];
    },
  });
  const [approve, setApprove] = useState<Post | null>(null);
  const [reject, setReject] = useState<Post | null>(null);
  const [reason, setReason] = useState("");

  const update = async (p: Post, status: "approved" | "rejected", reject_reason: string | null) => {
    const { error } = await supabase.from("posts").update({ status, reject_reason }).eq("id", p.id);
    if (error) { toast.error("Thao tác thất bại: " + error.message); return; }
    toast.success(status === "approved" ? "Đã duyệt bài đăng" : "Đã từ chối bài đăng");
    qc.invalidateQueries();
  };

  return (
    <Page title="Duyệt bài" subtitle={`${q.data?.length ?? 0} bài đang chờ duyệt`}>
      {q.isLoading ? <GridSkeleton n={3} /> : !q.data?.length ? <Empty text="Không có bài nào chờ duyệt" /> : (
        <div className="space-y-4">
          {q.data.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge status={p.status} />
                <span className="font-bold text-primary">{p.clubs?.name}</span>
                <span className="text-muted-foreground">· {p.type === "event" ? "Sự kiện" : "Tin tức"} · gửi {formatDateTime(p.created_at)}</span>
              </div>
              <h3 className="mt-2 text-lg font-bold">{p.title}</h3>
              {p.type === "event" && <p className="text-sm font-semibold text-muted-foreground">{formatDateTime(p.event_time)} · {p.location}</p>}
              {p.image_url && <img src={p.image_url} alt="" className="mt-3 max-h-64 rounded-xl object-cover" />}
              <p className="mt-3 whitespace-pre-line text-sm">{p.content}</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" className="border-destructive text-destructive" onClick={() => { setReason(""); setReject(p); }}>Từ chối</Button>
                <Button className="bg-success font-bold text-success-foreground hover:bg-success/90" onClick={() => setApprove(p)}>Duyệt</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!approve} onOpenChange={(o) => !o && setApprove(null)} title="Duyệt bài đăng này?" description="Bài sẽ được công khai và CLB nhận được thông báo." confirmText="Duyệt" onConfirm={() => approve && update(approve, "approved", null)} />
      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Từ chối bài đăng</DialogTitle></DialogHeader>
          <Textarea rows={4} maxLength={1000} placeholder="Nhập lý do từ chối (bắt buộc)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReject(null)}>Hủy</Button>
            <Button className="bg-destructive text-destructive-foreground" onClick={() => {
              if (!reason.trim()) { toast.error("Vui lòng nhập lý do từ chối"); return; }
              const p = reject!; setReject(null); update(p, "rejected", reason.trim());
            }}>Từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
