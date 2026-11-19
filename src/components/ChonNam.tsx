import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Năm nhỏ nhất được chọn: năm thành lập Học viện Ngân hàng. */
const NAM_MIN = 1961;

/**
 * Ô chọn năm dạng lịch: bấm vào mở bảng 12 năm, dùng mũi tên để lùi / tiến.
 * Không cho gõ chữ – chỉ chọn năm trong khoảng 1961 → năm hiện tại.
 */
export function ChonNam({
  value,
  onChange,
  placeholder = "Chọn năm",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string | undefined;
}) {
  const namNay = new Date().getFullYear();
  const [mo, setMo] = useState(false);
  // Trang đầu tiên: trang chứa năm đang chọn (hoặc năm nay)
  const dauTrang = (nam: number) => namNay - Math.floor((namNay - nam) / 12) * 12 - 11;
  const [batDau, setBatDau] = useState(() => dauTrang(value ?? namNay));

  const cacNam = Array.from({ length: 12 }, (_, i) => batDau + i);
  const lui = batDau > NAM_MIN;
  const toi = batDau + 11 < namNay;

  return (
    <Popover
      open={mo}
      onOpenChange={(v) => {
        setMo(v);
        if (v) setBatDau(dauTrang(value ?? namNay));
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border bg-background px-3 text-left text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{value ?? placeholder}</span>
          {value != null && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Xóa năm"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }
              }}
              className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Các năm trước"
            disabled={!lui}
            onClick={() => setBatDau((b) => b - 12)}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-extrabold">
            {Math.max(batDau, NAM_MIN)} – {batDau + 11}
          </span>
          <button
            type="button"
            aria-label="Các năm sau"
            disabled={!toi}
            onClick={() => setBatDau((b) => b + 12)}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {cacNam.map((n) => {
            const tat = n < NAM_MIN || n > namNay;
            const chon = n === value;
            return (
              <button
                key={n}
                type="button"
                disabled={tat}
                onClick={() => {
                  onChange(n);
                  setMo(false);
                }}
                className={cn(
                  "h-9 rounded-md text-sm font-bold transition-colors",
                  chon
                    ? "bg-primary text-primary-foreground"
                    : n === namNay
                      ? "border border-primary/40 text-primary hover:bg-primary/10"
                      : "hover:bg-muted",
                  tat && "invisible",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
