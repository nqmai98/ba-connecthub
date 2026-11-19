import { NHAN_TRUONG_CLB, type LinhVuc, type TruongCLBCoTheSua } from "@/lib/data";

const LA_ANH = new Set<TruongCLBCoTheSua>(["LogoCLB", "AnhBia"]);

/**
 * Hiển thị NoiDungThayDoi của bảng yeu_cau_cap_nhat (lưu dạng JSON các cột được đề xuất sửa)
 * thành bảng "Trường – Giá trị đề xuất" để Quản trị viên đọc được.
 */
export function BangThayDoi({
  noiDung,
  linhVuc,
  hienTai,
}: {
  noiDung: string;
  linhVuc?: LinhVuc[] | undefined;
  /** Thông tin CLB hiện tại – khi có, bảng hiện thêm cột "Hiện tại" để so sánh trước/sau. */
  hienTai?: Record<string, unknown> | null | undefined;
}) {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(noiDung) as Record<string, unknown>;
  } catch {
    return <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs">{noiDung}</pre>;
  }

  const entries = Object.entries(parsed);
  if (!entries.length)
    return <p className="text-sm text-muted-foreground">Không có thay đổi nào.</p>;

  const hienThi = (k: string, v: unknown) => {
    if (v === null || v === "")
      return <span className="italic text-muted-foreground">(để trống)</span>;
    if (k === "MaLinhVuc") {
      const ten = linhVuc?.find((lv) => lv.MaLinhVuc === Number(v))?.TenLinhVuc;
      return ten ?? String(v);
    }
    if (LA_ANH.has(k as TruongCLBCoTheSua)) {
      return <img src={String(v)} alt="" className="h-16 w-24 rounded-lg border object-cover" />;
    }
    return <span className="whitespace-pre-line">{String(v)}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        {hienTai && (
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-44 p-2.5 font-extrabold">Trường thông tin</th>
              <th className="p-2.5 font-extrabold">Hiện tại</th>
              <th className="p-2.5 font-extrabold text-primary">Đề xuất thay đổi</th>
            </tr>
          </thead>
        )}
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-b last:border-b-0">
              <th className="w-44 bg-muted p-2.5 text-left align-top font-bold">
                {NHAN_TRUONG_CLB[k as TruongCLBCoTheSua] ?? k}
              </th>
              {hienTai && (
                <td className="p-2.5 align-top text-muted-foreground line-through decoration-destructive/40">
                  {hienThi(k, hienTai[k] ?? null)}
                </td>
              )}
              <td className={hienTai ? "bg-success/5 p-2.5 align-top font-semibold" : "p-2.5 align-top"}>
                {hienThi(k, v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
