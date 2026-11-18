import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { NHAN_VAI_TRO, useAuth, type TenVaiTro } from "@/lib/auth";
import { formatDateTime } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/tai-khoan")({
  head: () => ({
    meta: [
      { title: "Quản lý tài khoản – BAV CLUBS" },
      { name: "description", content: "Quản lý vai trò và trạng thái tài khoản người dùng." },
      { property: "og:title", content: "Quản lý tài khoản – BAV CLUBS" },
      {
        property: "og:description",
        content: "Quản lý vai trò và trạng thái tài khoản người dùng.",
      },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["QuanTriVien"]}>
      <Accounts />
    </RoleGate>
  ),
});

type DongTaiKhoan = {
  MaNguoiDung: string;
  HoTen: string;
  EmailTruong: string;
  TenDangNhap: string | null;
  SoDienThoai: string | null;
  MaVaiTro: number;
  MaCLB: number | null;
  TrangThaiTaiKhoan: string;
  NgayCapTaiKhoan: string;
  vai_tro: { TenVaiTro: string } | null;
  cau_lac_bo: { TenCLB: string } | null;
};

function Accounts() {
  const { maNguoiDung } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const vaiTroList = useQuery({
    queryKey: ["vai_tro"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vai_tro")
        .select("MaVaiTro, TenVaiTro, MoTaQuyen")
        .order("MaVaiTro");
      if (error) throw error;
      return data;
    },
  });

  const q = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nguoi_dung")
        // cau_lac_bo phải chỉ rõ khoá ngoại: giữa nguoi_dung và cau_lac_bo còn một
        // đường quan hệ nhiều-nhiều qua theo_doi_clb nên PostgREST không tự chọn được
        .select("*, vai_tro(TenVaiTro), cau_lac_bo!nguoi_dung_MaCLB_fkey(TenCLB)")
        .order("NgayCapTaiKhoan", { ascending: false });
      if (error) throw error;
      return data as unknown as DongTaiKhoan[];
    },
  });

  const doiVaiTro = async (id: string, maVaiTro: number) => {
    const { error } = await supabase
      .from("nguoi_dung")
      .update({ MaVaiTro: maVaiTro })
      .eq("MaNguoiDung", id);
    if (error) {
      toast.error("Đổi vai trò thất bại: " + error.message);
      return;
    }
    const ten = vaiTroList.data?.find((v) => v.MaVaiTro === maVaiTro)?.TenVaiTro as
      TenVaiTro | undefined;
    toast.success("Đã đổi vai trò thành " + (ten ? NHAN_VAI_TRO[ten] : "vai trò mới"));
    qc.invalidateQueries({ queryKey: ["admin-accounts"] });
  };

  const doiTrangThai = async (id: string, khoa: boolean) => {
    const { error } = await supabase
      .from("nguoi_dung")
      .update({ TrangThaiTaiKhoan: khoa ? "BiKhoa" : "HoatDong" })
      .eq("MaNguoiDung", id);
    if (error) {
      toast.error("Thao tác thất bại: " + error.message);
      return;
    }
    toast.success(khoa ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
    qc.invalidateQueries({ queryKey: ["admin-accounts"] });
  };

  const rows = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return q.data ?? [];
    return (q.data ?? []).filter((u) =>
      [u.HoTen, u.EmailTruong, u.TenDangNhap ?? "", u.cau_lac_bo?.TenCLB ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(k),
    );
  }, [q.data, search]);

  return (
    <Page
      title="Quản lý tài khoản"
      subtitle="Mỗi tài khoản có đúng một vai trò theo thiết kế phân quyền"
      actions={
        <Input
          className="w-72"
          placeholder="Tìm theo tên, email, username hoặc CLB"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
    >
      {q.isLoading ? (
        <GridSkeleton n={3} />
      ) : !rows.length ? (
        <Empty text="Không có tài khoản" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted text-left font-bold">
              <tr>
                <th className="p-3">Họ tên</th>
                <th className="p-3">Email / Tên đăng nhập</th>
                <th className="p-3">CLB phụ trách</th>
                <th className="p-3">Ngày cấp</th>
                <th className="p-3">Vai trò</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.MaNguoiDung} className="border-t">
                  <td className="p-3 font-semibold">{u.HoTen || "—"}</td>
                  <td className="p-3">
                    {u.TenDangNhap ?? u.EmailTruong}
                    {u.TenDangNhap && (
                      <div className="text-xs text-muted-foreground">{u.EmailTruong}</div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{u.cau_lac_bo?.TenCLB ?? "—"}</td>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">
                    {formatDateTime(u.NgayCapTaiKhoan)}
                  </td>
                  <td className="p-3">
                    <select
                      disabled={u.MaNguoiDung === maNguoiDung}
                      className="h-9 rounded-md border bg-background px-2"
                      value={u.MaVaiTro}
                      onChange={(e) => doiVaiTro(u.MaNguoiDung, Number(e.target.value))}
                    >
                      {vaiTroList.data?.map((v) => (
                        <option key={v.MaVaiTro} value={v.MaVaiTro}>
                          {NHAN_VAI_TRO[v.TenVaiTro as TenVaiTro] ?? v.TenVaiTro}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    {u.TrangThaiTaiKhoan === "BiKhoa" ? (
                      <span className="font-bold text-destructive">Đã khóa</span>
                    ) : (
                      <span className="font-bold text-success">Hoạt động</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {u.MaNguoiDung !== maNguoiDung && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          doiTrangThai(u.MaNguoiDung, u.TrangThaiTaiKhoan !== "BiKhoa")
                        }
                      >
                        {u.TrangThaiTaiKhoan === "BiKhoa" ? "Mở khóa" : "Khóa"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
