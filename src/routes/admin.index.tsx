import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, GridSkeleton, Page, RoleGate } from "@/components/common";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard – BAV CLUBS" },
      { name: "description", content: "Thống kê tổng quan hệ thống BAV CLUBS." },
      { property: "og:title", content: "Dashboard – BAV CLUBS" },
      { property: "og:description", content: "Thống kê tổng quan hệ thống BAV CLUBS." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <Dashboard />
    </RoleGate>
  ),
});

function Dashboard() {
  const q = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [clubs, posts, yeuCau, stats] = await Promise.all([
        supabase.from("cau_lac_bo").select("MaCLB, TenCLB"),
        supabase.from("bai_dang").select("MaCLB, LoaiBaiDang, TrangThaiKiemDuyet"),
        supabase.from("yeu_cau_cap_nhat").select("TrangThaiXuLy"),
        supabase.from("thong_ke_truy_cap").select("LuotTruyCap").maybeSingle(),
      ]);
      const c = clubs.data ?? [];
      const p = posts.data ?? [];
      return {
        clubs: c.length,
        tinBai: p.filter((x) => x.LoaiBaiDang !== "SuKien").length,
        suKien: p.filter((x) => x.LoaiBaiDang === "SuKien").length,
        choDuyet: p.filter((x) => x.TrangThaiKiemDuyet === "ChoDuyet").length,
        yeuCauChoDuyet: (yeuCau.data ?? []).filter((x) => x.TrangThaiXuLy === "ChoDuyet").length,
        luotTruyCap: stats.data?.LuotTruyCap ?? 0,
        chart: c.map((cl) => ({
          name: cl.TenCLB.replace(/^CLB\s*/i, ""),
          "Tin bài": p.filter((x) => x.MaCLB === cl.MaCLB && x.LoaiBaiDang !== "SuKien").length,
          "Sự kiện": p.filter((x) => x.MaCLB === cl.MaCLB && x.LoaiBaiDang === "SuKien").length,
        })),
      };
    },
  });

  const s = q.data;
  const items = [
    ["Câu lạc bộ", s?.clubs],
    ["Tin bài", s?.tinBai],
    ["Sự kiện", s?.suKien],
    ["Bài chờ duyệt", s?.choDuyet],
    ["Yêu cầu chờ duyệt", s?.yeuCauChoDuyet],
    ["Lượt truy cập", s?.luotTruyCap],
  ] as const;

  return (
    <Page title="Dashboard">
      {q.isLoading ? (
        <GridSkeleton n={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {items.map(([l, v]) => (
              <Card key={l}>
                <div className="text-sm font-semibold text-muted-foreground">{l}</div>
                <div className="mt-1 text-3xl font-extrabold text-primary">{v ?? 0}</div>
              </Card>
            ))}
          </div>
          <Card className="mt-6">
            <h2 className="mb-4 text-lg font-bold">Số bài đăng theo CLB</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s?.chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Tin bài" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
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
