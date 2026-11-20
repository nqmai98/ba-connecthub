import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

/* ------------------------------------------------------------------ */
/* Miền giá trị của các thuộc tính trạng thái (theo thiết kế chương 4) */
/* ------------------------------------------------------------------ */

export type TrangThaiHoatDong = "DangHoatDong" | "TamNgung" | "NgungHoatDong";
export type LoaiBaiDang = "TinTuc" | "ChuongTrinh" | "ThanhTich" | "ThongBaoCLB" | "SuKien";
export type TrangThaiKiemDuyet = "ChoDuyet" | "DaDuyet" | "TuChoi";
export type LoaiSuKien = "HocThuat" | "PhiHocThuat";
export type TrangThaiDienRa = "SapDienRa" | "DangDienRa" | "DaDienRa";
export type TrangThaiXuLy = "ChoDuyet" | "DaDuyet" | "TuChoi";
export type KetQuaKiemDuyet = "DaDuyet" | "TuChoi";
export type LoaiThongBao = "DuyetBaiDang" | "CLBCapNhat" | "YeuCauCapNhat" | "HeThong";

export const NHAN_TRANG_THAI_HOAT_DONG: Record<TrangThaiHoatDong, string> = {
  DangHoatDong: "Đang hoạt động",
  TamNgung: "Tạm ngưng",
  NgungHoatDong: "Ngừng hoạt động",
};

export const NHAN_LOAI_BAI_DANG: Record<LoaiBaiDang, string> = {
  TinTuc: "Tin tức",
  ChuongTrinh: "Chương trình",
  ThanhTich: "Thành tích",
  ThongBaoCLB: "Thông báo CLB",
  SuKien: "Sự kiện",
};

export const NHAN_TRANG_THAI_KIEM_DUYET: Record<TrangThaiKiemDuyet, string> = {
  ChoDuyet: "Chờ duyệt",
  DaDuyet: "Đã duyệt",
  TuChoi: "Bị từ chối",
};

export const NHAN_LOAI_SU_KIEN: Record<LoaiSuKien, string> = {
  HocThuat: "Học thuật",
  PhiHocThuat: "Phi học thuật",
};

export const NHAN_TRANG_THAI_DIEN_RA: Record<TrangThaiDienRa, string> = {
  SapDienRa: "Sắp diễn ra",
  DangDienRa: "Đang diễn ra",
  DaDienRa: "Đã diễn ra",
};

export const NHAN_TRANG_THAI_XU_LY: Record<TrangThaiXuLy, string> = {
  ChoDuyet: "Chờ duyệt",
  DaDuyet: "Đã duyệt",
  TuChoi: "Từ chối",
};

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu ứng dụng                                               */
/* ------------------------------------------------------------------ */

export type CauLacBo = {
  MaCLB: number;
  TenCLB: string;
  NamThanhLap: number | null;
  /** Đơn vị trong sơ đồ tổ chức Đoàn – Hội (bảng don_vi_to_chuc); null = khác / chưa phân loại. */
  MaDonVi: number | null;
  /** Nhãn "Khối – Đơn vị", CSDL tự sinh từ MaDonVi. */
  DonViTrucThuoc: string | null;
  MoTa: string | null;
  LogoCLB: string | null;
  ThongTinLienHe: string | null;
  Fanpage: string | null;
  TrangThaiHoatDong: TrangThaiHoatDong;
  NgayCapNhat: string;
  GioiThieuNgan: string | null;
  BanChuyenMon: string | null;
  ThanhTich: string | null;
  AnhBia: string | null;
  NoiBat: boolean;
  don_vi_to_chuc?: { MaDonVi: number; Khoi: KhoiToChuc; TenDonVi: string } | null;
};

/** Cấp 1 của sơ đồ tổ chức: Đoàn Thanh niên hoặc Hội Sinh viên. */
export type KhoiToChuc = "DoanThanhNien" | "HoiSinhVien";

export const NHAN_KHOI: Record<KhoiToChuc, string> = {
  DoanThanhNien: "Đoàn Thanh niên",
  HoiSinhVien: "Hội Sinh viên",
};

/** Cấp 2: các ô xanh trong sơ đồ tổ chức (Liên chi hội, CLB cụm Học thuật, ...). */
export type NhomToChuc = {
  MaNhom: number;
  Khoi: KhoiToChuc;
  TenNhom: string;
  ThuTu: number;
  MoTa: string | null;
};

/** Khoá ngoại của CLB trong bài đăng, dùng để hiển thị tên và logo đơn vị tổ chức. */
export type CLBTomTat = { MaCLB: number; TenCLB: string; LogoCLB: string | null };

export type ThongTinSuKien = {
  LoaiSuKien: LoaiSuKien;
  ThoiGianBatDau: string;
  ThoiGianKetThuc: string;
  DiaDiem: string | null;
  TrangThaiDienRa: TrangThaiDienRa;
};

export type BaiDang = {
  MaBaiDang: number;
  MaCLB: number;
  MaNguoiTao: string | null;
  LoaiBaiDang: LoaiBaiDang;
  TieuDe: string;
  NoiDung: string;
  AnhBia: string | null;
  TrangThaiKiemDuyet: TrangThaiKiemDuyet;
  NgayTao: string;
  NgayDang: string | null;
  cau_lac_bo?: CLBTomTat | null;
  su_kien?: ThongTinSuKien | null;
};

/** Bài đăng loại Sự kiện đã được làm phẳng cùng các thuộc tính của bảng su_kien. */
export type SuKien = BaiDang & ThongTinSuKien;

export type LuotKiemDuyet = {
  MaKiemDuyet: number;
  MaBaiDang: number;
  MaQuanTriVien: string;
  KetQuaKiemDuyet: KetQuaKiemDuyet;
  LyDoTuChoi: string | null;
  ThoiGianKiemDuyet: string;
};

export type YeuCauCapNhat = {
  MaYeuCau: number;
  MaCLB: number;
  MaQuanTriVien: string | null;
  NoiDungThayDoi: string;
  TrangThaiXuLy: TrangThaiXuLy;
  ThoiGianGui: string;
  ThoiGianXuLy: string | null;
  LyDoTuChoi: string | null;
  cau_lac_bo?: { TenCLB: string } | null;
};

export type ThongBaoCuaToi = {
  MaThongBao: number;
  DaDoc: boolean;
  ThoiGianDoc: string | null;
  LoaiThongBao: LoaiThongBao;
  TieuDe: string;
  NoiDung: string;
  DuongDan: string | null;
  ThoiGianTao: string;
};

export type NhatKy = {
  MaNhatKy: number;
  MaNguoiDung: string;
  HanhDong: string;
  DoiTuongTacDong: string | null;
  MaDoiTuong: number | null;
  GiaTriCu: string | null;
  GiaTriMoi: string | null;
  ThoiGian: string;
  nguoi_dung?: { HoTen: string; EmailTruong: string } | null;
};

/** Các cột của bảng cau_lac_bo mà Đại diện CLB được phép đề xuất thay đổi. */
export const TRUONG_CLB_CO_THE_SUA = [
  "TenCLB",
  "NamThanhLap",
  "MaDonVi",
  "MoTa",
  "LogoCLB",
  "ThongTinLienHe",
  "Fanpage",
  "GioiThieuNgan",
  "BanChuyenMon",
  "ThanhTich",
  "AnhBia",
] as const;
export type TruongCLBCoTheSua = (typeof TRUONG_CLB_CO_THE_SUA)[number];

export const NHAN_TRUONG_CLB: Record<TruongCLBCoTheSua, string> = {
  TenCLB: "Tên CLB",
  NamThanhLap: "Năm thành lập",
  MaDonVi: "Đơn vị trực thuộc",
  MoTa: "Giới thiệu chi tiết",
  LogoCLB: "Logo CLB",
  ThongTinLienHe: "Thông tin liên hệ",
  Fanpage: "Fanpage",
  GioiThieuNgan: "Giới thiệu ngắn",
  BanChuyenMon: "Ban chuyên môn",
  ThanhTich: "Thành tích nổi bật",
  AnhBia: "Ảnh bìa",
};

const CHON_CLB_TOM_TAT = "cau_lac_bo(MaCLB, TenCLB, LogoCLB)";
/** Đơn vị trong sơ đồ tổ chức, nhúng kèm khi đọc cau_lac_bo. */
export const CHON_DON_VI = "don_vi_to_chuc(MaDonVi, Khoi, TenDonVi)";

/* ------------------------------------------------------------------ */
/* Câu lạc bộ                                                         */
/* ------------------------------------------------------------------ */

export function useCauLacBo() {
  return useQuery({
    queryKey: ["cau_lac_bo"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cau_lac_bo")
        .select(`*, ${CHON_DON_VI}`)
        .order("TenCLB");
      if (error) throw error;
      return data as unknown as CauLacBo[];
    },
  });
}

/** CLB mà tài khoản Đại diện CLB đang đăng nhập phụ trách (quan hệ 1–1). */
export function useCLBCuaToi() {
  const { maCLB } = useAuth();
  const { data, isLoading } = useCauLacBo();
  return { club: data?.find((c) => c.MaCLB === maCLB) ?? null, isLoading };
}

/* ------------------------------------------------------------------ */
/* Bài đăng & Sự kiện                                                  */
/* ------------------------------------------------------------------ */

/** Làm phẳng kết quả truy vấn su_kien + bai_dang thành một đối tượng SuKien. */
function phangSuKien(row: Record<string, unknown>): SuKien {
  const { bai_dang: bd, ...sk } = row as { bai_dang: Record<string, unknown> };
  return { ...(bd as object), ...(sk as object) } as SuKien;
}

export function useSuKien(opts: { sapDienRa?: boolean; maCLB?: number } = {}) {
  return useQuery({
    queryKey: ["su_kien", opts],
    staleTime: 60_000,
    queryFn: async () => {
      // TrangThaiDienRa phụ thuộc thời điểm hiện tại nên được làm mới trước khi đọc
      await supabase.rpc("lam_moi_trang_thai_su_kien");
      let q = supabase
        .from("su_kien")
        .select(`*, bai_dang!inner(*, ${CHON_CLB_TOM_TAT})`)
        .order("ThoiGianBatDau", { ascending: true });
      if (opts.sapDienRa) q = q.gte("ThoiGianKetThuc", new Date().toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? [])
        .map((r) => phangSuKien(r as Record<string, unknown>))
        .filter((e) => e.TrangThaiKiemDuyet === "DaDuyet")
        .filter((e) => !opts.maCLB || e.MaCLB === opts.maCLB);
    },
  });
}

/* ------------------------------------------------------------------ */
/* Tương tác: lượt xem, bình luận, lượt yêu thích                       */
/* ------------------------------------------------------------------ */

export type TuongTac = { LuotXem: number; LuotBinhLuan: number; LuotYeuThich: number };

/** Bài viết kèm số liệu tương tác, dùng cho banner nổi bật trang chủ. */
export type BaiVietNoiBat = BaiDang & TuongTac & { DiemNoiBat: number; Hang: number };

/**
 * 5–7 bài viết nổi bật cho banner trang chủ, chọn TỰ ĐỘNG theo tương tác trong 30 ngày gần nhất:
 *   điểm = lượt xem + 5 × lượt bình luận + 3 × lượt yêu thích
 * (hàm CSDL bai_viet_noi_bat – migration 0009). Gồm cả tin bài và sự kiện chưa kết thúc;
 * khi chưa có tương tác thì bài mới đăng đứng trước.
 */
export function useBaiVietNoiBat(gioiHan = 7) {
  return useQuery({
    queryKey: ["bai_viet_noi_bat", gioiHan],
    staleTime: 2 * 60_000,
    queryFn: async (): Promise<BaiVietNoiBat[]> => {
      await supabase.rpc("lam_moi_trang_thai_su_kien");
      const xh = await supabase.rpc("bai_viet_noi_bat", { _gioi_han: gioiHan });
      if (xh.error) throw xh.error;
      const ds = xh.data ?? [];
      if (!ds.length) return [];
      const { data, error } = await supabase
        .from("bai_dang")
        .select(`*, ${CHON_CLB_TOM_TAT}, su_kien(*)`)
        .in(
          "MaBaiDang",
          ds.map((r) => r.MaBaiDang),
        );
      if (error) throw error;
      const theoMa = new Map((data as unknown as BaiDang[]).map((b) => [b.MaBaiDang, b]));
      return ds
        .map((r) => {
          const b = theoMa.get(r.MaBaiDang);
          return b ? { ...b, ...r } : null;
        })
        .filter((b): b is Omit<BaiVietNoiBat, "Hang"> => !!b)
        .map((b, i) => ({ ...b, Hang: i + 1 }));
    },
  });
}

/** Tổng lượt xem / bình luận / yêu thích của một hoặc nhiều bài (hàm dem_tuong_tac). */
export function useTuongTac(dsMaBaiDang: number[]) {
  const ds = [...new Set(dsMaBaiDang)].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["tuong_tac", ds],
    enabled: ds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dem_tuong_tac", { _ds_bai_dang: ds });
      if (error) throw error;
      return new Map(
        (data ?? []).map((r) => [
          r.MaBaiDang,
          { LuotXem: r.LuotXem, LuotBinhLuan: r.LuotBinhLuan, LuotYeuThich: r.LuotYeuThich } as TuongTac,
        ]),
      );
    },
  });
}

/**
 * Ghi một lượt xem khi mở trang bài viết. Trình duyệt chỉ gửi 1 lần / bài / phiên;
 * CSDL tự bỏ qua lượt xem lặp lại của cùng tài khoản trong 30 phút và bài chưa duyệt.
 */
export async function ghiLuotXem(maBaiDang: number) {
  const khoa = `bav-da-xem-${maBaiDang}`;
  try {
    if (sessionStorage.getItem(khoa)) return false;
    sessionStorage.setItem(khoa, "1");
  } catch {
    /* trình duyệt chặn sessionStorage: vẫn ghi, CSDL tự chống lặp với tài khoản đã đăng nhập */
  }
  const { error } = await supabase.rpc("ghi_luot_xem", { _ma_bai_dang: maBaiDang });
  return !error;
}

export type BinhLuan = {
  MaBinhLuan: number;
  NoiDung: string;
  ThoiGianTao: string;
  HoTen: string;
  VaiTro: string;
  CuaToi: boolean;
  CoTheXoa: boolean;
};

export function useBinhLuan(maBaiDang: number) {
  const { maNguoiDung } = useAuth();
  return useQuery({
    queryKey: ["binh_luan", maBaiDang, maNguoiDung],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("binh_luan_cua_bai", { _ma_bai_dang: maBaiDang });
      if (error) throw error;
      return (data ?? []) as BinhLuan[];
    },
  });
}

export function useGuiBinhLuan(maBaiDang: number) {
  const qc = useQueryClient();
  const { maNguoiDung } = useAuth();
  return useMutation({
    mutationFn: async (noiDung: string) => {
      const { error } = await supabase
        .from("binh_luan")
        .insert({ MaBaiDang: maBaiDang, MaNguoiDung: maNguoiDung!, NoiDung: noiDung.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["binh_luan", maBaiDang] });
      qc.invalidateQueries({ queryKey: ["tuong_tac"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("quá nhanh")
          ? e.message
          : "Chưa gửi được bình luận. Kiểm tra kết nối rồi thử lại.",
      ),
  });
}

export function useXoaBinhLuan(maBaiDang: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (maBinhLuan: number) => {
      const { error } = await supabase.from("binh_luan").delete().eq("MaBinhLuan", maBinhLuan);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xóa bình luận");
      qc.invalidateQueries({ queryKey: ["binh_luan", maBaiDang] });
      qc.invalidateQueries({ queryKey: ["tuong_tac"] });
    },
    onError: () => toast.error("Chưa xóa được bình luận, vui lòng thử lại"),
  });
}

/** Toàn bộ bài đăng đã duyệt của một CLB (gồm cả sự kiện), cho trang chi tiết CLB. */
export function useBaiDangCuaCLB(maCLB: number) {
  return useQuery({
    queryKey: ["bai_dang_clb", maCLB],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bai_dang")
        .select(`*, ${CHON_CLB_TOM_TAT}, su_kien(*)`)
        .eq("MaCLB", maCLB)
        .eq("TrangThaiKiemDuyet", "DaDuyet")
        .order("NgayDang", { ascending: false });
      if (error) throw error;
      return data as unknown as BaiDang[];
    },
  });
}

/** Một bài viết cho trang đọc bài /bai-viet/$id (RLS: sinh viên chỉ xem được bài đã duyệt). */
export function useBaiViet(maBaiDang: number) {
  return useQuery({
    queryKey: ["bai_viet", maBaiDang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bai_dang")
        .select(`*, ${CHON_CLB_TOM_TAT}, su_kien(*)`)
        .eq("MaBaiDang", maBaiDang)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BaiDang | null;
    },
  });
}

/* ------------------------------------------------------------------ */
/* Theo dõi CLB                                                        */
/* ------------------------------------------------------------------ */

export type LuotTheoDoi = { MaCLB: number; BatThongBao: boolean; NgayTheoDoi: string };

export function useTheoDoi() {
  const { maNguoiDung } = useAuth();
  return useQuery({
    queryKey: ["theo_doi", maNguoiDung],
    enabled: !!maNguoiDung,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theo_doi_clb")
        .select("MaCLB, BatThongBao, NgayTheoDoi")
        .eq("MaNguoiDung", maNguoiDung!);
      if (error) throw error;
      return new Map((data as LuotTheoDoi[]).map((d) => [d.MaCLB, d]));
    },
  });
}

export function useToggleTheoDoi() {
  const qc = useQueryClient();
  const { maNguoiDung } = useAuth();
  return useMutation({
    mutationFn: async ({ maCLB, theoDoi }: { maCLB: number; theoDoi: boolean }) => {
      const r = theoDoi
        ? await supabase.from("theo_doi_clb").insert({ MaNguoiDung: maNguoiDung!, MaCLB: maCLB })
        : await supabase
            .from("theo_doi_clb")
            .delete()
            .eq("MaNguoiDung", maNguoiDung!)
            .eq("MaCLB", maCLB);
      if (r.error) throw r.error;
      return theoDoi;
    },
    onSuccess: (theoDoi) => {
      toast.success(theoDoi ? "Đã theo dõi câu lạc bộ" : "Đã bỏ theo dõi câu lạc bộ");
      qc.invalidateQueries({ queryKey: ["theo_doi"] });
      qc.invalidateQueries({ queryKey: ["nguoi_theo_doi"] });
    },
    onError: () => toast.error("Thao tác thất bại, vui lòng thử lại"),
  });
}

/** Bật/tắt nhận thông báo từ một CLB đang theo dõi (thuộc tính BatThongBao). */
export function useToggleThongBaoTheoDoi() {
  const qc = useQueryClient();
  const { maNguoiDung } = useAuth();
  return useMutation({
    mutationFn: async ({ maCLB, bat }: { maCLB: number; bat: boolean }) => {
      const { error } = await supabase
        .from("theo_doi_clb")
        .update({ BatThongBao: bat })
        .eq("MaNguoiDung", maNguoiDung!)
        .eq("MaCLB", maCLB);
      if (error) throw error;
      return bat;
    },
    onSuccess: (bat) => {
      toast.success(
        bat ? "Đã bật thông báo từ câu lạc bộ này" : "Đã tắt thông báo từ câu lạc bộ này",
      );
      qc.invalidateQueries({ queryKey: ["theo_doi"] });
    },
    onError: () => toast.error("Thao tác thất bại, vui lòng thử lại"),
  });
}

/* ------------------------------------------------------------------ */
/* Yêu thích sự kiện (nguồn dữ liệu của Lịch cá nhân)                  */
/* ------------------------------------------------------------------ */

export function useYeuThich() {
  const { maNguoiDung } = useAuth();
  return useQuery({
    queryKey: ["yeu_thich", maNguoiDung],
    enabled: !!maNguoiDung,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yeu_thich_su_kien")
        .select(`MaBaiDang, NgayYeuThich, su_kien!inner(*, bai_dang!inner(*, ${CHON_CLB_TOM_TAT}))`)
        .eq("MaNguoiDung", maNguoiDung!);
      if (error) throw error;
      return (data ?? [])
        .map((r) => phangSuKien((r as unknown as { su_kien: Record<string, unknown> }).su_kien))
        .sort((a, b) => a.ThoiGianBatDau.localeCompare(b.ThoiGianBatDau));
    },
  });
}

export function useToggleYeuThich() {
  const qc = useQueryClient();
  const { maNguoiDung } = useAuth();
  return useMutation({
    mutationFn: async ({ maBaiDang, yeuThich }: { maBaiDang: number; yeuThich: boolean }) => {
      const r = yeuThich
        ? await supabase
            .from("yeu_thich_su_kien")
            .insert({ MaNguoiDung: maNguoiDung!, MaBaiDang: maBaiDang })
        : await supabase
            .from("yeu_thich_su_kien")
            .delete()
            .eq("MaNguoiDung", maNguoiDung!)
            .eq("MaBaiDang", maBaiDang);
      if (r.error) throw r.error;
      return yeuThich;
    },
    onSuccess: (yeuThich) => {
      toast.success(
        yeuThich ? "Đã lưu sự kiện vào lịch cá nhân" : "Đã xóa sự kiện khỏi lịch cá nhân",
      );
      qc.invalidateQueries({ queryKey: ["yeu_thich"] });
    },
    onError: () => toast.error("Thao tác thất bại, vui lòng thử lại"),
  });
}

/* ------------------------------------------------------------------ */
/* Thông báo (thong_bao + nguoi_nhan_thong_bao)                        */
/* ------------------------------------------------------------------ */

export function useThongBao() {
  const { maNguoiDung } = useAuth();
  return useQuery({
    queryKey: ["thong_bao", maNguoiDung],
    enabled: !!maNguoiDung,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nguoi_nhan_thong_bao")
        .select("MaThongBao, DaDoc, ThoiGianDoc, thong_bao!inner(*)")
        .eq("MaNguoiDung", maNguoiDung!)
        .order("MaThongBao", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((r) => {
        const { thong_bao: tb, ...nhan } = r as unknown as {
          thong_bao: Record<string, unknown>;
          MaThongBao: number;
          DaDoc: boolean;
          ThoiGianDoc: string | null;
        };
        return { ...(tb as object), ...nhan } as ThongBaoCuaToi;
      });
    },
  });
}

export function useDanhDauDaDoc() {
  const qc = useQueryClient();
  const { maNguoiDung } = useAuth();
  return useMutation({
    mutationFn: async (maThongBao?: number) => {
      let q = supabase
        .from("nguoi_nhan_thong_bao")
        .update({ DaDoc: true })
        .eq("MaNguoiDung", maNguoiDung!)
        .eq("DaDoc", false);
      if (maThongBao !== undefined) q = q.eq("MaThongBao", maThongBao);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thong_bao"] }),
    onError: () => toast.error("Không cập nhật được thông báo"),
  });
}

/* ------------------------------------------------------------------ */
/* Tiện ích                                                            */
/* ------------------------------------------------------------------ */

export async function uploadImage(file: File, maNguoiDung: string) {
  if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh tối đa 5MB");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${maNguoiDung}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const signed = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Thứ Ba, 12/05/2026 14:00 – 17:00" hoặc kèm ngày nếu sự kiện kéo dài qua ngày. */
export function formatKhoangThoiGian(batDau: string | null, ketThuc: string | null) {
  if (!batDau) return "";
  if (!ketThuc) return formatDateTime(batDau);
  const a = new Date(batDau);
  const b = new Date(ketThuc);
  const gio = (d: Date) => d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (a.toDateString() === b.toDateString()) return `${formatDateTime(batDau)} – ${gio(b)}`;
  return `${formatDateTime(batDau)} – ${formatDateTime(ketThuc)}`;
}
