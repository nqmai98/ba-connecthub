import { createFileRoute } from "@tanstack/react-router";
import { laEmailNoiBo } from "@/lib/club-account";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { deleteUserAccount } from "@/lib/admin.functions";
import { ConfirmDialog } from "@/components/common";
import { FilterChip } from "@/components/student/Filters";
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
  cau_lac_bo: { TenCLB: string; EmailLienHe: string | null } | null;
};

function Accounts() {
  const { maNguoiDung } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [vaiTroLoc, setVaiTroLoc] = useState<string | null>(null);
  const [xoa, setXoa] = useState<DongTaiKhoan | null>(null);
  const xoaTaiKhoan = useServerFn(deleteUserAccount);

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
        .select("*, vai_tro(TenVaiTro), cau_lac_bo!nguoi_dung_MaCLB_fkey(TenCLB, EmailLienHe)")
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

  const xacNhanXoa = async (u: DongTaiKhoan) => {
    try {
      await xoaTaiKhoan({ data: { maNguoiDung: u.MaNguoiDung } });
      toast.success("Đã xóa tài khoản " + (u.HoTen || u.TenDangNhap || (laEmailNoiBo(u.EmailTruong) ? "" : u.EmailTruong)));
      qc.invalidateQueries({ queryKey: ["admin-accounts"] });
      qc.invalidateQueries({ queryKey: ["dai-dien-clb"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Lọc theo từ khóa trước, rồi theo vai trò (để số đếm trên từng vai trò khớp với từ khóa)
  const theoTuKhoa = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return q.data ?? [];
    return (q.data ?? []).filter((u) =>
      [u.HoTen, u.EmailTruong, u.TenDangNhap ?? "", u.cau_lac_bo?.TenCLB ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(k),
    );
  }, [q.data, search]);
  const rows = vaiTroLoc ? theoTuKhoa.filter((u) => u.vai_tro?.TenVaiTro === vaiTroLoc) : theoTuKhoa;

  return (
    <Page
      title="Quản lý tài khoản"
      actions={
        <Input
          className="w-72"
          placeholder="Tìm theo tên, email, username hoặc CLB"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
    >
      {/* Lọc theo vai trò */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-muted-foreground">Vai trò</span>
        <FilterChip active={!vaiTroLoc} count={theoTuKhoa.length} onClick={() => setVaiTroLoc(null)}>
          Tất cả
        </FilterChip>
        {(vaiTroList.data ?? []).map((v) => (
          <FilterChip
            key={v.MaVaiTro}
            active={vaiTroLoc === v.TenVaiTro}
            count={theoTuKhoa.filter((u) => u.vai_tro?.TenVaiTro === v.TenVaiTro).length}
            onClick={() => setVaiTroLoc(vaiTroLoc === v.TenVaiTro ? null : v.TenVaiTro)}
          >
            {NHAN_VAI_TRO[v.TenVaiTro as TenVaiTro] ?? v.TenVaiTro}
          </FilterChip>
        ))}
      </div>

      {q.isLoading ? (
        <GridSkeleton n={3} />
      ) : !rows.length ? (
        <Empty text="Không có tài khoản phù hợp" />
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
                    {u.TenDangNhap ?? (laEmailNoiBo(u.EmailTruong) ? "—" : u.EmailTruong)}
                    {(u.TenDangNhap || laEmailNoiBo(u.EmailTruong)) && (
                      <div className="text-xs text-muted-foreground">
                        {laEmailNoiBo(u.EmailTruong)
                          ? (u.cau_lac_bo?.EmailLienHe ?? "—")
                          : u.EmailTruong}
                      </div>
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
                  <td className="p-3">
                    {u.MaNguoiDung !== maNguoiDung && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            doiTrangThai(u.MaNguoiDung, u.TrangThaiTaiKhoan !== "BiKhoa")
                          }
                        >
                          {u.TrangThaiTaiKhoan === "BiKhoa" ? "Mở khóa" : "Khóa"}
                        </Button>
                        {u.vai_tro?.TenVaiTro !== "QuanTriVien" && (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={"Xóa tài khoản " + (u.HoTen || u.TenDangNhap || "")}
                            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setXoa(u)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Xóa
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={!!xoa}
        onOpenChange={(o) => !o && setXoa(null)}
        title={`Xóa tài khoản ${xoa?.HoTen || xoa?.TenDangNhap || (laEmailNoiBo(xoa?.EmailTruong) ? "" : xoa?.EmailTruong) || ""}?`}
        description={
          xoa?.vai_tro?.TenVaiTro === "DaiDienCLB"
            ? `Tài khoản đại diện sẽ bị xóa vĩnh viễn; CLB ${xoa?.cau_lac_bo?.TenCLB ?? ""} vẫn được giữ lại.`
            : "Tài khoản và dữ liệu cá nhân trên BAV CLUBS sẽ bị xóa vĩnh viễn."
        }
        confirmText="Xóa vĩnh viễn"
        destructive
        onConfirm={() => xoa && xacNhanXoa(xoa)}
      />
    </Page>
  );
}
