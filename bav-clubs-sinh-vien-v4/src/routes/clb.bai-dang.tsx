import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { History, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Empty,
  GridSkeleton,
  LoaiBaiDangBadge,
  Page,
  RoleGate,
  TrangThaiKiemDuyetBadge,
} from "@/components/common";
import { PostForm } from "@/components/forms";
import { useAuth } from "@/lib/auth";
import { formatDateTime, type BaiDang, type LuotKiemDuyet } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/clb/bai-dang")({
  head: () => ({
    meta: [
      { title: "Bài đăng của tôi – BAV CLUBS" },
      {
        name: "description",
        content: "Theo dõi trạng thái và lịch sử kiểm duyệt các bài đăng của CLB.",
      },
      { property: "og:title", content: "Bài đăng của tôi – BAV CLUBS" },
      { property: "og:description", content: "Theo dõi trạng thái duyệt các bài đăng của CLB." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <MyPosts />
    </RoleGate>
  ),
});

type BaiDangKemKiemDuyet = BaiDang & { kiem_duyet: LuotKiemDuyet[] };

function MyPosts() {
  const { maCLB } = useAuth();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<BaiDang | null>(null);
  const [lichSu, setLichSu] = useState<BaiDangKemKiemDuyet | null>(null);

  const q = useQuery({
    queryKey: ["bai_dang_cua_toi", maCLB],
    enabled: !!maCLB,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bai_dang")
        .select("*, su_kien(*), kiem_duyet(*)")
        .eq("MaCLB", maCLB!)
        .order("NgayTao", { ascending: false })
        .order("ThoiGianKiemDuyet", { referencedTable: "kiem_duyet", ascending: false });
      if (error) throw error;
      return data as unknown as BaiDangKemKiemDuyet[];
    },
  });

  if (!maCLB)
    return (
      <Page title="Bài đăng của tôi">
        <Empty text="Tài khoản chưa được gán CLB nào" />
      </Page>
    );

  return (
    <Page
      title="Bài đăng của tôi"
      actions={
        <Button asChild className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
          <Link to="/clb/dang-bai">
            <Plus className="h-4 w-4" /> Đăng bài
          </Link>
        </Button>
      }
    >
      {q.isLoading ? (
        <GridSkeleton n={3} />
      ) : !q.data?.length ? (
        <Empty text="Chưa có bài đăng nào" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted text-left font-bold">
              <tr>
                <th className="p-3">Tiêu đề</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Ngày gửi</th>
                <th className="p-3">Ngày đăng</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => {
                const moiNhat = p.kiem_duyet?.[0];
                return (
                  <tr key={p.MaBaiDang} className="border-t align-top">
                    <td className="p-3 font-semibold">
                      {p.TieuDe}
                      {p.TrangThaiKiemDuyet === "TuChoi" && (
                        <div className="mt-1 text-xs font-medium text-destructive">
                          Lý do: {moiNhat?.LyDoTuChoi || "không ghi nhận"}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <LoaiBaiDangBadge loai={p.LoaiBaiDang} />
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDateTime(p.NgayTao)}</td>
                    <td className="p-3 text-muted-foreground">
                      {p.NgayDang ? formatDateTime(p.NgayDang) : "—"}
                    </td>
                    <td className="p-3">
                      <TrangThaiKiemDuyetBadge trangThai={p.TrangThaiKiemDuyet} />
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {!!p.kiem_duyet?.length && (
                          <Button size="sm" variant="ghost" onClick={() => setLichSu(p)}>
                            <History className="h-3.5 w-3.5" /> Lịch sử
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />{" "}
                          {p.TrangThaiKiemDuyet === "TuChoi" ? "Sửa & gửi lại" : "Sửa"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bài đăng</DialogTitle>
          </DialogHeader>
          {edit && (
            <PostForm
              maCLB={edit.MaCLB}
              initial={edit}
              onCancel={() => setEdit(null)}
              onDone={() => {
                setEdit(null);
                qc.invalidateQueries({ queryKey: ["bai_dang_cua_toi"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!lichSu} onOpenChange={(o) => !o && setLichSu(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lịch sử kiểm duyệt</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-semibold text-muted-foreground">{lichSu?.TieuDe}</p>
          <ul className="space-y-3">
            {lichSu?.kiem_duyet?.map((kd) => (
              <li key={kd.MaKiemDuyet} className="rounded-xl border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <TrangThaiKiemDuyetBadge trangThai={kd.KetQuaKiemDuyet} />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {formatDateTime(kd.ThoiGianKiemDuyet)}
                  </span>
                </div>
                {kd.LyDoTuChoi && <p className="mt-2 text-destructive">Lý do: {kd.LyDoTuChoi}</p>}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
