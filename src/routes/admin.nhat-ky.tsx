import { laEmailNoiBo, emailToUsername } from "@/lib/club-account";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { formatDateTime, type NhatKy } from "@/lib/data";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/nhat-ky")({
  head: () => ({
    meta: [
      { title: "Nhật ký hoạt động – BAV CLUBS" },
      {
        name: "description",
        content: "Nhật ký các thao tác quan trọng trên hệ thống, phục vụ giám sát và truy vết.",
      },
      { property: "og:title", content: "Nhật ký hoạt động – BAV CLUBS" },
      { property: "og:description", content: "Nhật ký các thao tác quan trọng trên hệ thống." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <ActivityLog />
    </RoleGate>
  ),
});

const NHAN_HANH_DONG: Record<string, string> = {
  TaoCLB: "Tạo CLB",
  CapNhatCLB: "Cập nhật CLB",
  XoaCLB: "Xóa CLB",
  GuiBaiDang: "Gửi bài đăng",
  DuyetBaiDang: "Duyệt bài đăng",
  TuChoiBaiDang: "Từ chối bài đăng",
  GuiYeuCauCapNhat: "Gửi yêu cầu cập nhật",
  DuyetYeuCauCapNhat: "Duyệt yêu cầu cập nhật",
  TuChoiYeuCauCapNhat: "Từ chối yêu cầu cập nhật",
  KhoaTaiKhoan: "Khóa tài khoản",
  MoKhoaTaiKhoan: "Mở khóa tài khoản",
  DoiVaiTro: "Đổi vai trò",
};

function ActivityLog() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["nhat-ky"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nhat_ky_hoat_dong")
        .select("*, nguoi_dung(HoTen, EmailTruong)")
        .order("ThoiGian", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as unknown as NhatKy[];
    },
  });

  const rows = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return q.data ?? [];
    return (q.data ?? []).filter((r) =>
      [
        r.HanhDong,
        NHAN_HANH_DONG[r.HanhDong] ?? "",
        r.DoiTuongTacDong ?? "",
        r.GiaTriCu ?? "",
        r.GiaTriMoi ?? "",
        r.nguoi_dung?.HoTen ?? "",
        r.nguoi_dung?.EmailTruong ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(k),
    );
  }, [q.data, search]);

  return (
    <Page
      title="Nhật ký hoạt động"
      actions={
        <Input
          className="w-72"
          placeholder="Tìm theo thao tác, người thực hiện..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
    >
      {q.isLoading ? (
        <GridSkeleton n={3} />
      ) : !rows.length ? (
        <Empty text="Chưa ghi nhận thao tác nào" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted text-left font-bold">
              <tr>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Người thực hiện</th>
                <th className="p-3">Thao tác</th>
                <th className="p-3">Đối tượng</th>
                <th className="p-3">Giá trị cũ</th>
                <th className="p-3">Giá trị mới</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.MaNhatKy} className="border-t align-top">
                  <td className="whitespace-nowrap p-3 text-muted-foreground">
                    {formatDateTime(r.ThoiGian)}
                  </td>
                  <td className="p-3 font-semibold">
                    {r.nguoi_dung?.HoTen || "—"}
                    <div className="text-xs font-medium text-muted-foreground">
                      {laEmailNoiBo(r.nguoi_dung?.EmailTruong) ? emailToUsername(r.nguoi_dung!.EmailTruong) : r.nguoi_dung?.EmailTruong}
                    </div>
                  </td>
                  <td className="p-3 font-bold text-primary">
                    {NHAN_HANH_DONG[r.HanhDong] ?? r.HanhDong}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {r.DoiTuongTacDong}
                    {r.MaDoiTuong !== null && ` #${r.MaDoiTuong}`}
                  </td>
                  <td className="max-w-[220px] p-3 text-muted-foreground">{r.GiaTriCu ?? "—"}</td>
                  <td className="max-w-[220px] p-3">{r.GiaTriMoi ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
