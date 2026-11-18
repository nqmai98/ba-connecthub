/** Lọc thời gian theo năm học / học kì – dùng chung cho Dashboard Quản trị và Tổng quan CLB. */
export type HocKi = "ca-nam" | "hk1" | "hk2" | "hk3";

export const NHAN_HOC_KI: Record<HocKi, string> = {
  "ca-nam": "Cả năm",
  hk1: "Học kì 1",
  hk2: "Học kì 2",
  hk3: "Học kì 3",
};

/** Năm học Y–Y+1: HK1 tháng 8–12 năm Y, HK2 tháng 1–6 năm Y+1, HK3 tháng 7 năm Y+1. */
export function khoangHocKi(namHoc: number, hk: HocKi): [Date, Date] {
  const d = (y: number, m: number) => new Date(y, m, 1);
  switch (hk) {
    case "hk1":
      return [d(namHoc, 7), d(namHoc + 1, 0)];
    case "hk2":
      return [d(namHoc + 1, 0), d(namHoc + 1, 6)];
    case "hk3":
      return [d(namHoc + 1, 6), d(namHoc + 1, 7)];
    default:
      return [d(namHoc, 7), d(namHoc + 1, 7)];
  }
}

export const namHocCua = (t: Date) => (t.getMonth() >= 7 ? t.getFullYear() : t.getFullYear() - 1);

/** Danh sách năm học từ mốc sớm nhất trong dữ liệu đến năm học hiện tại (mới nhất trước). */
export function danhSachNamHoc(cacMoc: (string | Date)[]) {
  const hienTai = namHocCua(new Date());
  const dauTien = Math.min(hienTai, ...cacMoc.map((m) => namHocCua(new Date(m))));
  return Array.from({ length: hienTai - dauTien + 1 }, (_, i) => hienTai - i);
}

/** Các tháng trong khoảng [tu, den) – dùng làm trục X của biểu đồ. */
export function cacThang(tu: Date, den: Date) {
  const kq: { y: number; m: number; ten: string }[] = [];
  for (let t = new Date(tu); t < den; t = new Date(t.getFullYear(), t.getMonth() + 1, 1))
    kq.push({ y: t.getFullYear(), m: t.getMonth(), ten: `T${t.getMonth() + 1}/${String(t.getFullYear()).slice(2)}` });
  return kq;
}
