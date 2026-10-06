import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, GridSkeleton, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard – BA CLUBS" }, { name: "description", content: "Thống kê tổng quan hệ thống BA CLUBS." }, { property: "og:title", content: "Dashboard – BA CLUBS" }, { property: "og:description", content: "Thống kê tổng quan hệ thống BA CLUBS." }] }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <Dashboard />
    </RoleGate>
  ),
});

function Dashboard() {
  const q = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [clubs, posts, stats] = await Promise.all([
        supabase.from("clubs").select("id, name"),
        supabase.from("posts").select("club_id, type, status"),
        supabase.from("site_stats").select("visits").maybeSingle(),
      ]);
      const c = clubs.data ?? [], p = posts.data ?? [];
      return {
        clubs: c.length,
        news: p.filter((x) => x.type === "news").length,
        events: p.filter((x) => x.type === "event").length,
        pending: p.filter((x) => x.status === "pending").length,
        visits: stats.data?.visits ?? 0,
        chart: c.map((cl) => ({
          name: cl.name.replace(/^CLB\s*/i, ""),
          "Tin tức": p.filter((x) => x.club_id === cl.id && x.type === "news").length,
          "Sự kiện": p.filter((x) => x.club_id === cl.id && x.type === "event").length,
        })),
      };
    },
  });
  const s = q.data;
  const items = [["Câu lạc bộ", s?.clubs], ["Bài viết", s?.news], ["Sự kiện", s?.events], ["Chờ duyệt", s?.pending], ["Lượt truy cập", s?.visits]] as const;
  return (
    <Page title="Dashboard">
      {q.isLoading ? <GridSkeleton n={3} /> : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {items.map(([l, v]) => <Card key={l}><div className="text-sm font-semibold text-muted-foreground">{l}</div><div className="mt-1 text-3xl font-extrabold text-primary">{v ?? 0}</div></Card>)}
          </div>
          <Card className="mt-6">
            <h2 className="mb-4 text-lg font-bold">Số bài đăng theo CLB</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s?.chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Tin tức" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Sự kiện" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}
