import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { formatDateTime, type LoaiBaiDang } from "@/lib/data";
import { vanBanThuan } from "@/lib/noi-dung";
import { LoaiBaiDangBadge } from "@/components/common";
import { cn } from "@/lib/utils";

/** Thẻ tin dạng news card – dùng lại ở trang CLB và "Bài đăng của tôi". */
export function TheTin({
  bai,
  phu,
  tabMoi = false,
  className,
}: {
  bai: {
    MaBaiDang: number;
    TieuDe: string;
    NoiDung: string;
    AnhBia: string | null;
    LoaiBaiDang: LoaiBaiDang;
    NgayDang?: string | null;
    NgayTao: string;
  };
  phu?: ReactNode;
  /** Mở bài trong tab mới (dùng ở khu Đại diện CLB để xem trước bài như sinh viên thấy). */
  tabMoi?: boolean;
  className?: string;
}) {
  return (
    <Link
      to="/bai-viet/$id"
      params={{ id: String(bai.MaBaiDang) }}
      {...(tabMoi ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cn("group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary", className)}
    >
      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary to-primary-dark">
        {bai.AnhBia && (
          <img
            src={bai.AnhBia}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <LoaiBaiDangBadge loai={bai.LoaiBaiDang} />
          <span className="text-xs font-semibold text-muted-foreground">
            {formatDateTime(bai.NgayDang ?? bai.NgayTao)}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-base leading-snug group-hover:text-primary">{bai.TieuDe}</h3>
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{vanBanThuan(bai.NoiDung)}</p>
        {phu && <div className="mt-auto pt-3">{phu}</div>}
      </div>
    </Link>
  );
}
