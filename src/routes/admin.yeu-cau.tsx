import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  ConfirmDialog,
  Empty,
  GridSkeleton,
  Page,
  RoleGate,
  TrangThaiXuLyBadge,
} from "@/components/common";
import { BangThayDoi } from "@/components/yeu-cau";
import { formatDateTime, useLinhVuc, type TrangThaiXuLy, type YeuCauCapNhat } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/yeu-cau")({
  head: () => ({
    meta: [
      { title: "Duyệt yêu cầu cập nhật – BAV CLUBS" },
      {
        name: "description",
        content: "Duyệt các yêu cầu cập nhật thông tin do đại diện câu lạc bộ gửi lên.",
      },
      { property: "og:title", content: "Duyệt yêu cầu cập nhật – BAV CLUBS" },
      { property: "og:description", content: "Duyệt các yêu cầu cập nhật thông tin câu lạc bộ." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <ReviewRequests />
    </RoleGate>
  ),
});

function ReviewRequests() {
  const qc = useQueryClient();
  const { data: linhVuc } = useLinhVuc();
  const [loc, setLoc] = useState<TrangThaiXuLy>("ChoDuyet");
  const [approve, setApprove] = useState<YeuCauCapNhat | null>(null);
  const [reject, setReject] = useState<YeuCauCapNhat | null>(null);
  const [reason, setReason] = useState("");

  const q = useQuery({
    queryKey: ["yeu-cau-admin", loc],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yeu_cau_cap_nhat")
        .select("*, cau_lac_bo(TenCLB)")
        .eq("TrangThaiXuLy", loc)
        .order("ThoiGianGui", { ascending: false });
      if (error) throw error;
      return data as unknown as YeuCauCapNhat[];
    },
  });

  const xuLy = async (yc: YeuCauCapNhat, trangThai: TrangThaiXuLy, lyDo: string | null) => {
    const { error } = await supabase
      .from("yeu_cau_cap_nhat")
      .update({ TrangThaiXuLy: trangThai, LyDoTuChoi: lyDo })
      .eq("MaYeuCau", yc.MaYeuCau);
    if (error) {
      toast.error("Thao tác thất bại: " + error.message);
      return;
    }
    toast.success(trangThai === "DaDuyet" ? "Đã duyệt và áp dụng thay đổi" : "Đã từ chối yêu cầu");
    qc.invalidateQueries();
  };

  const tab = (a: boolean) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-bold",
      a ? "bg-primary text-primary-foreground" : "border bg-card text-primary",
    );

  return (
    <Page
      title="Duyệt yêu cầu cập nhật"
      subtitle="Thay đổi chỉ được ghi vào bảng cau_lac_bo sau khi bạn duyệt"
      actions={
        <div className="flex flex-wrap gap-2">
          <button className={tab(loc === "ChoDuyet")} onClick={() => setLoc("ChoDuyet")}>
            Chờ duyệt
          </button>
          <button className={tab(loc === "DaDuyet")} onClick={() => setLoc("DaDuyet")}>
            Đã duyệt
          </button>
          <button className={tab(loc === "TuChoi")} onClick={() => setLoc("TuChoi")}>
            Đã từ chối
          </button>
        </div>
      }
    >
      {q.isLoading ? (
        <GridSkeleton n={2} />
      ) : !q.data?.length ? (
        <Empty text="Không có yêu cầu nào trong mục này" />
      ) : (
        <div className="space-y-4">
          {q.data.map((yc) => (
            <Card key={yc.MaYeuCau}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <TrangThaiXuLyBadge trangThai={yc.TrangThaiXuLy} />
                <span className="font-bold text-primary">{yc.cau_lac_bo?.TenCLB}</span>
                <span className="text-muted-foreground">
                  · gửi {formatDateTime(yc.ThoiGianGui)}
                </span>
                {yc.ThoiGianXuLy && (
                  <span className="text-muted-foreground">
                    · xử lý {formatDateTime(yc.ThoiGianXuLy)}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <BangThayDoi noiDung={yc.NoiDungThayDoi} linhVuc={linhVuc} />
              </div>
              {yc.TrangThaiXuLy === "TuChoi" && yc.LyDoTuChoi && (
                <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                  Lý do từ chối: {yc.LyDoTuChoi}
                </p>
              )}
              {yc.TrangThaiXuLy === "ChoDuyet" && (
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive"
                    onClick={() => {
                      setReason("");
                      setReject(yc);
                    }}
                  >
                    Từ chối
                  </Button>
                  <Button
                    className="bg-success font-bold text-success-foreground hover:bg-success/90"
                    onClick={() => setApprove(yc)}
                  >
                    Duyệt & áp dụng
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!approve}
        onOpenChange={(o) => !o && setApprove(null)}
        title="Duyệt yêu cầu này?"
        description="Các trường trong yêu cầu sẽ được ghi vào thông tin CLB và CLB nhận được thông báo."
        confirmText="Duyệt & áp dụng"
        onConfirm={() => approve && xuLy(approve, "DaDuyet", null)}
      />

      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu cập nhật</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={1000}
            placeholder="Nhập lý do từ chối (bắt buộc)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReject(null)}>
              Hủy
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (!reason.trim()) {
                  toast.error("Vui lòng nhập lý do từ chối");
                  return;
                }
                const yc = reject!;
                setReject(null);
                xuLy(yc, "TuChoi", reason.trim());
              }}
            >
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
