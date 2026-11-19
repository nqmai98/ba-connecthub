import { NHAN_HOC_KI, type HocKi } from "@/lib/hoc-ki";
import { cn } from "@/lib/utils";

/** Ô chọn năm học + các nút Cả năm / Học kì 1 / Học kì 2 / Học kì 3. */
export function BoLocHocKi({
  dsNamHoc,
  namHoc,
  hocKi,
  onNamHoc,
  onHocKi,
}: {
  dsNamHoc: number[];
  namHoc: number;
  hocKi: HocKi;
  onNamHoc: (y: number) => void;
  onHocKi: (k: HocKi) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Năm học"
        value={namHoc}
        onChange={(e) => onNamHoc(Number(e.target.value))}
        className="h-10 rounded-xl border bg-card px-3 text-sm font-bold text-primary"
      >
        {dsNamHoc.map((y) => (
          <option key={y} value={y}>
            Năm học {y}–{y + 1}
          </option>
        ))}
      </select>
      <div className="flex rounded-xl border bg-card p-1" role="group" aria-label="Học kì">
        {(Object.keys(NHAN_HOC_KI) as HocKi[]).map((k) => (
          <button
            key={k}
            onClick={() => onHocKi(k)}
            aria-pressed={hocKi === k}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-bold transition",
              hocKi === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
            )}
          >
            {NHAN_HOC_KI[k]}
          </button>
        ))}
      </div>
    </div>
  );
}
