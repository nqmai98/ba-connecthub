import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clb/")({
  head: () => ({ meta: [{ title: "Tổng quan CLB – BA CLUBS" }, { name: "description", content: "Tổng quan hoạt động của câu lạc bộ." }, { property: "og:title", content: "Tổng quan CLB – BA CLUBS" }, { property: "og:description", content: "Tổng quan hoạt động của câu lạc bộ." }] }),
  component: () => (
    <RoleGate roles={["club_rep"]}>
      <Overview />
    </RoleGate>
  ),
});

function Overview() {
  const { clubIds } = useAuth();
  const clubId = clubIds[0];
  const q = useQuery({
    queryKey: ["rep-stats", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const [f, posts] = await Promise.all([
        supabase.rpc("club_follower_count", { _club_id: clubId! }),
        supabase.from("posts").select("status, type, event_time").eq("club_id", clubId!),
      ]);
      const p = posts.data ?? [];
      const now = Date.now();
      return {
        followers: f.data ?? 0,
        total: p.length,
        pending: p.filter((x) => x.status === "pending").length,
        upcoming: p.filter((x) => x.type === "event" && x.status === "approved" && x.event_time && new Date(x.event_time).getTime() > now).length,
      };
    },
  });
  if (!clubId) return <Page title="Tổng quan CLB"><Empty text="Tài khoản chưa được gán CLB nào" /></Page>;
  const s = q.data;
  const items = [["Người theo dõi", s?.followers], ["Bài đã gửi", s?.total], ["Bài chờ duyệt", s?.pending], ["Sự kiện sắp tới", s?.upcoming]] as const;
  return (
    <Page title="Tổng quan CLB">
      {q.isLoading ? <GridSkeleton n={4} /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map(([l, v]) => <Card key={l}><div className="text-sm font-semibold text-muted-foreground">{l}</div><div className="mt-1 text-3xl font-extrabold text-primary">{v ?? 0}</div></Card>)}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="bg-accent font-bold text-accent-foreground hover:bg-accent/90"><Link to="/clb/dang-bai"><Plus className="h-4 w-4" /> Đăng bài mới</Link></Button>
        <Button asChild variant="outline"><Link to="/clb/bai-dang"><FileText className="h-4 w-4" /> Bài đăng của tôi</Link></Button>
        <Button asChild variant="outline"><Link to="/clb/thong-tin"><Settings className="h-4 w-4" /> Thông tin CLB</Link></Button>
      </div>
    </Page>
  );
}
