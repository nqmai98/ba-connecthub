import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Empty, GridSkeleton, Page, RoleGate, TrangThaiXuLyBadge } from "@/components/common";
import { useAuth } from "@/lib/auth";
import { formatDateTime, type YeuCauCapNhat } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { BangThayDoi } from "@/components/yeu-cau";

export const Route = createFileRoute("/clb/yeu-cau")({
  head: () => ({
    meta: [
      { title: "Yêu cầu cập nhật – BAV CLUBS" },
      {
        name: "description",
        content: "Theo dõi các yêu cầu cập nhật thông tin câu lạc bộ đã gửi tới Quản trị viên.",
      },
      { property: "og:title", content: "Yêu cầu cập nhật – BAV CLUBS" },
      {
        property: "og:description",
        content: "Theo dõi các yêu cầu cập nhật thông tin câu lạc bộ.",
      },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <MyRequests />
    </RoleGate>
  ),
});

function MyRequests() {
  const { maCLB } = useAuth();
  const q = useQuery({
    queryKey: ["yeu_cau_cua_clb", maCLB],
    enabled: !!maCLB,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yeu_cau_cap_nhat")
        .select("*")
        .eq("MaCLB", maCLB!)
        .order("ThoiGianGui", { ascending: false });
      if (error) throw error;
      return data as unknown as YeuCauCapNhat[];
    },
  });

  if (!maCLB)
    return (
      <Page title="Yêu cầu cập nhật">
        <Empty text="Tài khoản chưa được gán CLB nào" />
      </Page>
    );

  return (
    <Page
      title="Yêu cầu cập nhật"
      subtitle="Các đề xuất thay đổi thông tin CLB và kết quả xử lý của Quản trị viên"
      actions={
        <Button asChild variant="outline">
          <Link to="/clb/thong-tin">
            <Settings className="h-4 w-4" /> Gửi yêu cầu mới
          </Link>
        </Button>
      }
    >
      {q.isLoading ? (
        <GridSkeleton n={2} />
      ) : !q.data?.length ? (
        <Empty
          text="Bạn chưa gửi yêu cầu cập nhật nào"
          action={
            <Button asChild>
              <Link to="/clb/thong-tin">Cập nhật thông tin CLB</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {q.data.map((yc) => (
            <Card key={yc.MaYeuCau}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <TrangThaiXuLyBadge trangThai={yc.TrangThaiXuLy} />
                <span className="font-semibold text-muted-foreground">
                  Gửi {formatDateTime(yc.ThoiGianGui)}
                </span>
                {yc.ThoiGianXuLy && (
                  <span className="text-muted-foreground">
                    · xử lý {formatDateTime(yc.ThoiGianXuLy)}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <BangThayDoi noiDung={yc.NoiDungThayDoi} />
              </div>
              {yc.TrangThaiXuLy === "TuChoi" && (
                <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                  Lý do từ chối: {yc.LyDoTuChoi || "không ghi nhận"}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
