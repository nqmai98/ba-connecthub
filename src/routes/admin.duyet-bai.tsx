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
  LoaiBaiDangBadge,
  LoaiSuKienBadge,
  Page,
  RoleGate,
  TrangThaiKiemDuyetBadge,
} from "@/components/common";
import { formatDateTime, formatKhoangThoiGian, type BaiDang } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/duyet-bai")({
  head: () => ({
    meta: [
      { title: "Duyệt bài – BA CLUBS" },
      { name: "description", content: "Duyệt bài đăng do các CLB gửi lên." },
      { property: "og:title", content: "Duyệt bài – BA CLUBS" },
      { property: "og:description", content: "Duyệt bài đăng do các CLB gửi lên." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <Review />
    </RoleGate>
  ),
});

function Review() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["bai-cho-duyet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bai_dang")
        .select("*, cau_lac_bo(MaCLB, TenCLB, LogoCLB), su_kien(*)")
        .eq("TrangThaiKiemDuyet", "ChoDuyet")
        .order("NgayTao");
      if (error) throw error;
      return data as unknown as BaiDang[];
    },
  });

  const [approve, setApprove] = useState<BaiDang | null>(null);
  const [reject, setReject] = useState<BaiDang | null>(null);
  const [reason, setReason] = useState("");

  const duyet = async (p: BaiDang) => {
    const { error } = await supabase
      .from("bai_dang")
      .update({ TrangThaiKiemDuyet: "DaDuyet" })
      .eq("MaBaiDang", p.MaBaiDang);
    if (error) {
      toast.error("Thao tác thất bại: " + error.message);
      return;
    }
    toast.success("Đã duyệt bài đăng");
    qc.invalidateQueries();
  };

  // Từ chối đi qua hàm tu_choi_bai_dang() để lý do được ghi vào bảng kiem_duyet
  const tuChoi = async (p: BaiDang, lyDo: string) => {
    const { error } = await supabase.rpc("tu_choi_bai_dang", {
      _ma_bai_dang: p.MaBaiDang,
      _ly_do: lyDo,
    });
    if (error) {
      toast.error("Thao tác thất bại: " + error.message);
      return;
    }
    toast.success("Đã từ chối bài đăng");
    qc.invalidateQueries();
  };

  return (
    <Page title="Duyệt bài" subtitle={`${q.data?.length ?? 0} bài đang chờ duyệt`}>
      {q.isLoading ? (
        <GridSkeleton n={3} />
      ) : !q.data?.length ? (
        <Empty text="Không có bài nào chờ duyệt" />
      ) : (
        <div className="space-y-4">
          {q.data.map((p) => (
            <Card key={p.MaBaiDang}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <TrangThaiKiemDuyetBadge trangThai={p.TrangThaiKiemDuyet} />
                <LoaiBaiDangBadge loai={p.LoaiBaiDang} />
                {p.su_kien && <LoaiSuKienBadge loai={p.su_kien.LoaiSuKien} />}
                <span className="font-bold text-primary">{p.cau_lac_bo?.TenCLB}</span>
                <span className="text-muted-foreground">· gửi {formatDateTime(p.NgayTao)}</span>
              </div>
              <h3 className="mt-2 text-lg font-bold">{p.TieuDe}</h3>
              {p.su_kien && (
                <p className="text-sm font-semibold text-muted-foreground">
                  {formatKhoangThoiGian(p.su_kien.ThoiGianBatDau, p.su_kien.ThoiGianKetThuc)} ·{" "}
                  {p.su_kien.DiaDiem}
                </p>
              )}
              {p.AnhBia && (
                <img src={p.AnhBia} alt="" className="mt-3 max-h-64 rounded-xl object-cover" />
              )}
              <p className="mt-3 whitespace-pre-line text-sm">{p.NoiDung}</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="border-destructive text-destructive"
                  onClick={() => {
                    setReason("");
                    setReject(p);
                  }}
                >
                  Từ chối
                </Button>
                <Button
                  className="bg-success font-bold text-success-foreground hover:bg-success/90"
                  onClick={() => setApprove(p)}
                >
                  Duyệt
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!approve}
        onOpenChange={(o) => !o && setApprove(null)}
        title="Duyệt bài đăng này?"
        description="Bài sẽ được công khai, CLB và những người đang theo dõi CLB nhận được thông báo."
        confirmText="Duyệt"
        onConfirm={() => approve && duyet(approve)}
      />

      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối bài đăng</DialogTitle>
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
                const p = reject!;
                setReject(null);
                tuChoi(p, reason.trim());
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
