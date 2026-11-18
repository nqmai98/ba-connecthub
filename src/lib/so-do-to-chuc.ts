import type { CauLacBo, NhomToChuc } from "./data";

/**
 * SƠ ĐỒ TỔ CHỨC ĐOÀN THANH NIÊN – HỘI SINH VIÊN HỌC VIỆN NGÂN HÀNG
 * dùng cho bộ lọc CLB 2 cấp (Tổ chức -> Đơn vị).
 *
 * Danh sách đơn vị được khai báo sẵn trong code nên bộ lọc chạy được ngay, KHÔNG cần sửa CSDL.
 * Nếu sau này chạy file sql/0007_nhom_to_chuc.sql thì danh sách và việc gán CLB
 * sẽ lấy từ CSDL (Admin gán trong form Quản lý CLB) và phần dưới đây chỉ còn là dự phòng.
 */
export const DON_VI_MAC_DINH: NhomToChuc[] = [
  { MaNhom: 1, Khoi: "DoanThanhNien", TenNhom: "Bộ phận hành chính", ThuTu: 1 },
  { MaNhom: 2, Khoi: "DoanThanhNien", TenNhom: "Đội trực thuộc", ThuTu: 2 },
  { MaNhom: 3, Khoi: "DoanThanhNien", TenNhom: "Ban chuyên môn", ThuTu: 3 },
  { MaNhom: 4, Khoi: "DoanThanhNien", TenNhom: "LCĐ, CĐ trực thuộc", ThuTu: 4 },
  { MaNhom: 5, Khoi: "HoiSinhVien", TenNhom: "CLB cụm Tình nguyện – Sở thích", ThuTu: 1 },
  { MaNhom: 6, Khoi: "HoiSinhVien", TenNhom: "Liên chi hội", ThuTu: 2 },
  { MaNhom: 7, Khoi: "HoiSinhVien", TenNhom: "CLB cụm Học thuật", ThuTu: 3 },
  { MaNhom: 8, Khoi: "HoiSinhVien", TenNhom: "CLB cụm Kỹ năng", ThuTu: 4 },
  { MaNhom: 9, Khoi: "HoiSinhVien", TenNhom: "Đội trực thuộc", ThuTu: 5 },
];

/**
 * QUY TẮC XẾP CLB VÀO ĐƠN VỊ THEO TÊN (khi CLB chưa được Admin gán trong CSDL).
 * So khớp trên tên CLB đã bỏ dấu, viết thường. Quy tắc nào khớp TRƯỚC thì được dùng,
 * nên các quy tắc cụ thể (VD "ctv khoa") phải đứng trước quy tắc chung (VD "tai chinh").
 * Thêm CLB mới: thêm từ khóa đặc trưng trong tên vào đúng dòng.
 */
const QUY_TAC: { khoi: NhomToChuc["Khoi"]; tenNhom: string; tuKhoa: RegExp }[] = [
  // ---- Hội Sinh viên ----
  { khoi: "HoiSinhVien", tenNhom: "Đội trực thuộc", tuKhoa: /\b(bluewings|fintech\w*|ctv bch)\b/ },
  { khoi: "HoiSinhVien", tenNhom: "Liên chi hội", tuKhoa: /\b(lien chi hoi|lch|ctv khoa)\b/ },
  // ---- Đoàn Thanh niên ----
  { khoi: "DoanThanhNien", tenNhom: "LCĐ, CĐ trực thuộc", tuKhoa: /\b(lien chi doan|lcd|chi doan)\b/ },
  { khoi: "DoanThanhNien", tenNhom: "Ban chuyên môn", tuKhoa: /\b(ban phong trao|ban tinh nguyen|ban tai chinh|uy ban kiem tra)\b/ },
  { khoi: "DoanThanhNien", tenNhom: "Bộ phận hành chính", tuKhoa: /\b(van phong doan)\b/ },
  // ---- Hội Sinh viên: các cụm CLB ----
  {
    khoi: "HoiSinhVien",
    tenNhom: "CLB cụm Học thuật",
    tuKhoa:
      /\b(chung khoan|sec|ke toan|kiem toan|kinh doanh quoc te|tieng anh|tin hoc|nghien cuu|luat|kinh te tre|finance|clb tai chinh|fc)\b/,
  },
  {
    khoi: "HoiSinhVien",
    tenNhom: "CLB cụm Kỹ năng",
    tuKhoa: /\b(ky nang|thuyet trinh|khoi nghiep|nha ngan hang tuong lai|nguon nhan luc)\b/,
  },
  {
    khoi: "HoiSinhVien",
    tenNhom: "CLB cụm Tình nguyện – Sở thích",
    tuKhoa:
      /\b(tinh nguyen|van nghe|mc|mcc|guitar|truyen thong|karate|karatedo|taekwondo|bong chuyen|bong da|bong ban|cau long|sach|nhay|dance)\b/,
  },
];

const boDau = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Danh sách đơn vị dùng làm cấu hình giao diện hiện tại. */
export function useSoDoToChuc() {
  return { data: DON_VI_MAC_DINH, isLoading: false };
}

/** Mã đơn vị của một CLB được suy ra từ tên hiển thị. */
export function maNhomCuaCLB(c: CauLacBo, ds: NhomToChuc[]): number | null {
  const ten = boDau(c.TenCLB);
  const quyTac = QUY_TAC.find((q) => q.tuKhoa.test(ten));
  if (!quyTac) return null;
  return ds.find((n) => n.Khoi === quyTac.khoi && n.TenNhom === quyTac.tenNhom)?.MaNhom ?? null;
}
