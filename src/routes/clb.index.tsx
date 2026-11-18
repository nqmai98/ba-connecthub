import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileText, Plus, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clb/")({
  head: () => ({
    meta: [
      { title: "Tổng quan CLB – BAV CLUBS" },
      { name: "description", content: "Tổng quan hoạt động của câu lạc bộ." },
      { property: "og:title", content: "Tổng quan CLB – BAV CLUBS" },
      { property: "og:description", content: "Tổng quan hoạt động của câu lạc bộ." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <Overview />
    </RoleGate>
  ),
});

function Overview() {
  const { maCLB } = useAuth();
  const q = useQuery({
    queryKey: ["tong-quan-clb", maCLB],
    enabled: !!maCLB,
    queryFn: async () => {
      const [theoDoi, baiDang, yeuCau] = await Promise.all([
        supabase.rpc("dem_nguoi_theo_doi", { _ma_clb: maCLB! }),
        supabase
          .from("bai_dang")
          .select("TrangThaiKiemDuyet, LoaiBaiDang, su_kien(ThoiGianKetThuc)")
          .eq("MaCLB", maCLB!),
        supabase.from("yeu_cau_cap_nhat").select("TrangThaiXuLy").eq("MaCLB", maCLB!),
      ]);
      const p = baiDang.data ?? [];
      const now = Date.now();
      return {
        nguoiTheoDoi: theoDoi.data ?? 0,
        tong: p.length,
        choDuyet: p.filter((x) => x.TrangThaiKiemDuyet === "ChoDuyet").length,
        sapToi: p.filter(
          (x) =>
            x.LoaiBaiDang === "SuKien" &&
            x.TrangThaiKiemDuyet === "DaDuyet" &&
            x.su_kien &&
            new Date((x.su_kien as { ThoiGianKetThuc: string }).ThoiGianKetThuc).getTime() > now,
        ).length,
        yeuCauChoDuyet: (yeuCau.data ?? []).filter((x) => x.TrangThaiXuLy === "ChoDuyet").length,
      };
    },
  });

  if (!maCLB)
    return (
      <Page title="Tổng quan CLB">
        <Empty text="Tài khoản chưa được gán CLB nào" />
      </Page>
    );

  const s = q.data;
  const items = [
    ["Người theo dõi", s?.nguoiTheoDoi],
    ["Bài đã gửi", s?.tong],
    ["Bài chờ duyệt", s?.choDuyet],
    ["Sự kiện sắp tới", s?.sapToi],
    ["Yêu cầu chờ duyệt", s?.yeuCauChoDuyet],
  ] as const;

  return (
    <Page title="Tổng quan CLB">
      {q.isLoading ? (
        <GridSkeleton n={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {items.map(([l, v]) => (
            <Card key={l}>
              <div className="text-sm font-semibold text-muted-foreground">{l}</div>
              <div className="mt-1 text-3xl font-extrabold text-primary">{v ?? 0}</div>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
          <Link to="/clb/dang-bai">
            <Plus className="h-4 w-4" /> Đăng bài mới
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/clb/bai-dang">
            <FileText className="h-4 w-4" /> Bài đăng của tôi
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/clb/thong-tin">
            <Settings className="h-4 w-4" /> Thông tin CLB
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/clb/yeu-cau">
            <ClipboardList className="h-4 w-4" /> Yêu cầu cập nhật
          </Link>
        </Button>
      </div>
    </Page>
  );
}
