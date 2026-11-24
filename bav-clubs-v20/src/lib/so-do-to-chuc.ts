import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dbMoi } from "@/lib/db-moi";
import { NHAN_KHOI, type CauLacBo, type KhoiToChuc, type NhomToChuc } from "./data";

/**
 * SƠ ĐỒ TỔ CHỨC ĐOÀN THANH NIÊN – HỘI SINH VIÊN HỌC VIỆN NGÂN HÀNG
 *
 * Cấp 1 (Khối): Đoàn Thanh niên / Hội Sinh viên.
 * Cấp 2 (Đơn vị – các ô xanh): lưu ở bảng don_vi_to_chuc; mỗi CLB trỏ tới một đơn vị
 * qua cột cau_lac_bo.MaDonVi (NULL = không thuộc Đoàn/Hội hoặc chưa phân loại).
 * Thay hoàn toàn cách phân loại theo "lĩnh vực" cũ (xem migration 0009).
 *
 * Danh sách dưới đây chỉ là dữ liệu hiển thị tạm trong lúc tải từ CSDL.
 */
export const DON_VI_MAC_DINH: NhomToChuc[] = [
  { MaNhom: 1, Khoi: "DoanThanhNien", TenNhom: "Bộ phận hành chính", ThuTu: 1, MoTa: null },
  { MaNhom: 2, Khoi: "DoanThanhNien", TenNhom: "Đội trực thuộc", ThuTu: 2, MoTa: null },
  { MaNhom: 3, Khoi: "DoanThanhNien", TenNhom: "Ban chuyên môn", ThuTu: 3, MoTa: null },
  { MaNhom: 4, Khoi: "DoanThanhNien", TenNhom: "LCĐ, CĐ trực thuộc", ThuTu: 4, MoTa: null },
  {
    MaNhom: 5,
    Khoi: "HoiSinhVien",
    TenNhom: "CLB cụm Tình nguyện – Sở thích",
    ThuTu: 1,
    MoTa: null,
  },
  { MaNhom: 6, Khoi: "HoiSinhVien", TenNhom: "Liên chi hội", ThuTu: 2, MoTa: null },
  { MaNhom: 7, Khoi: "HoiSinhVien", TenNhom: "CLB cụm Học thuật", ThuTu: 3, MoTa: null },
  { MaNhom: 8, Khoi: "HoiSinhVien", TenNhom: "CLB cụm Kỹ năng", ThuTu: 4, MoTa: null },
  { MaNhom: 9, Khoi: "HoiSinhVien", TenNhom: "Đội trực thuộc", ThuTu: 5, MoTa: null },
];

/** Danh sách đơn vị (ô xanh) đọc từ bảng don_vi_to_chuc, sắp theo khối rồi thứ tự. */
export function useSoDoToChuc() {
  const q = useQuery({
    queryKey: ["don_vi_to_chuc"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await dbMoi
        .from("don_vi_to_chuc")
        .select("MaDonVi, Khoi, TenDonVi, ThuTu, MoTa")
        .order("Khoi")
        .order("ThuTu");
      if (error) throw error;
      return (data ?? []).map((d): NhomToChuc => ({
        MaNhom: d.MaDonVi,
        Khoi: d.Khoi as KhoiToChuc,
        TenNhom: d.TenDonVi,
        ThuTu: d.ThuTu,
        MoTa: d.MoTa,
      }));
    },
  });
  return {
    // Chưa có dữ liệu (CSDL chưa chạy phần cấu trúc, hoặc Quản trị viên chưa bấm "Nhập sơ đồ
    // tổ chức") thì vẫn hiển thị khung sơ đồ mặc định để giao diện không trống.
    data: q.data?.length ? q.data : DON_VI_MAC_DINH,
    isLoading: q.isLoading,
    /** Bảng don_vi_to_chuc đã có nhưng chưa có đơn vị nào -> cần bấm "Nhập sơ đồ tổ chức". */
    chuaNhap: q.isSuccess && q.data.length === 0,
    /** CSDL chưa có bảng don_vi_to_chuc (chưa chạy file cấu trúc). */
    chuaCoCauTruc: q.isError,
  };
}

/** "Hội Sinh viên – CLB cụm Học thuật" */
export const nhanDonVi = (n: NhomToChuc) => `${NHAN_KHOI[n.Khoi]} – ${n.TenNhom}`;

/** Đơn vị (ô xanh cấp 2) của một CLB; null = khác / chưa phân loại. */
export function maNhomCuaCLB(c: CauLacBo, _ds?: NhomToChuc[]): number | null {
  return c.MaDonVi ?? null;
}

/** Khối (cấp 1) của một CLB; null = khác / chưa phân loại. */
export function khoiCuaCLB(c: CauLacBo, ds: NhomToChuc[]): KhoiToChuc | null {
  if (c.MaDonVi == null) return null;
  return ds.find((n) => n.MaNhom === c.MaDonVi)?.Khoi ?? c.don_vi_to_chuc?.Khoi ?? null;
}

/** Nhãn đơn vị của CLB để hiển thị trên thẻ / trang chi tiết. */
export function tenDonViCuaCLB(c: CauLacBo): string | null {
  const dv = c.don_vi_to_chuc;
  return dv ? `${NHAN_KHOI[dv.Khoi]} – ${dv.TenDonVi}` : null;
}
