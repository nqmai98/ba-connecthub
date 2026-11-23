import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Bỏ dấu tiếng Việt để tìm "cau lac bo" vẫn ra "Câu lạc bộ". */
export const boDau = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/**
 * Ô tìm kiếm có nút "Tìm kiếm" theo đúng luồng con 1 trong PTTKHT:
 * sinh viên nhập từ khóa -> bấm "Tìm kiếm" (hoặc Enter) -> hệ thống lọc danh sách.
 */
export function SearchBar({
  value,
  onSearch,
  placeholder,
}: {
  value: string;
  onSearch: (q: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <form
      role="search"
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text.trim());
      }}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          aria-label={placeholder}
          className="h-12 rounded-xl bg-card pl-11 pr-10 text-base shadow-sm"
        />
        {text && (
          <button
            type="button"
            aria-label="Xóa từ khóa"
            onClick={() => {
              setText("");
              onSearch("");
            }}
            className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button
        type="submit"
        className="h-12 rounded-xl bg-primary px-5 font-extrabold text-primary-foreground hover:bg-primary-dark"
      >
        <span className="hidden sm:inline">Tìm kiếm</span>
        <Search className="h-5 w-5 sm:hidden" />
      </Button>
    </form>
  );
}

/** Ô tìm CLB ở trang chủ: chuyển sang trang Câu lạc bộ kèm từ khóa. */
export function ClubSearchBox() {
  const navigate = useNavigate();
  return (
    <SearchBar
      value=""
      placeholder="Tìm câu lạc bộ theo tên hoặc từ khóa..."
      onSearch={(q) => navigate({ to: "/cau-lac-bo", search: { q: q || undefined } })}
    />
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number | undefined;
  title?: string | undefined;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_rgb(41_45_120/0.8)]"
          : "bg-card text-primary hover:border-primary hover:bg-secondary",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            active ? "bg-white/20" : "bg-secondary text-secondary-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Một nhóm bộ lọc có nhãn, ví dụ "Lĩnh vực", "Loại sự kiện". */
export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-28 shrink-0 text-sm font-bold text-muted-foreground">{label}</span>
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{children}</div>
    </div>
  );
}

/** Dòng kết quả: "Tìm thấy N ..." + nút xóa bộ lọc khi đang lọc. */
export function ResultBar({
  count,
  unit,
  filtering,
  onClear,
}: {
  count: number;
  unit: string;
  filtering: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 text-sm">
      <p className="font-semibold text-muted-foreground">
        {filtering ? "Tìm thấy " : "Có "}
        <span className="font-extrabold text-primary">{count}</span> {unit}
      </p>
      {filtering && (
        <button onClick={onClear} className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
          <X className="h-4 w-4" /> Xóa bộ lọc
        </button>
      )}
    </div>
  );
}
