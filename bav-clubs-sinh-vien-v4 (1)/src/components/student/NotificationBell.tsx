import { Link, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import { formatDateTime, useDanhDauDaDoc, useThongBao, type ThongBaoCuaToi } from "@/lib/data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Chuông thông báo thay cho mục "Thông báo" trên thanh điều hướng.
 * Khi có thông báo chưa đọc: chuông rung lắc định kỳ (chỉ hiệu ứng, không có âm thanh)
 * và có chấm đỏ nhấp nháy. Bấm vào chuông để xem nhanh 5 thông báo mới nhất.
 */
export function NotificationBell() {
  const { data } = useThongBao();
  const danhDau = useDanhDauDaDoc();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = data?.filter((n) => !n.DaDoc).length ?? 0;
  const latest = (data ?? []).slice(0, 5);

  const openItem = async (n: ThongBaoCuaToi) => {
    setOpen(false);
    if (!n.DaDoc) await danhDau.mutateAsync(n.MaThongBao);
    navigate({ to: n.DuongDan || "/thong-bao" });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={unread ? `Thông báo, ${unread} thông báo chưa đọc` : "Thông báo"}
          className={cn(
            "relative grid h-10 w-10 place-items-center rounded-full border bg-card/80 text-primary transition hover:border-primary hover:bg-secondary",
            open && "border-primary bg-secondary",
          )}
        >
          <Bell className={cn("h-5 w-5", unread > 0 && !open && "bell-ringing")} />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
              <span className="bell-dot-ping absolute inline-flex h-full w-full rounded-full bg-destructive" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-extrabold text-primary">Thông báo</div>
          {unread > 0 && (
            <button
              className="text-xs font-bold text-primary hover:underline"
              onClick={() => danhDau.mutate(undefined)}
            >
              Đánh dấu đã đọc tất cả
            </button>
          )}
        </div>
        {latest.length ? (
          <ul className="max-h-96 overflow-y-auto py-1">
            {latest.map((n) => (
              <li key={n.MaThongBao}>
                <button
                  onClick={() => openItem(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary",
                    !n.DaDoc && "bg-accent/10",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.DaDoc ? "bg-transparent" : "bg-destructive",
                    )}
                  />
                  <span className="min-w-0">
                    <span className={cn("line-clamp-2 text-sm", !n.DaDoc && "font-bold")}>
                      {n.TieuDe}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
                      {formatDateTime(n.ThoiGianTao)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
            Bạn chưa có thông báo nào
          </p>
        )}
        <Link
          to="/thong-bao"
          onClick={() => setOpen(false)}
          className="block border-t px-4 py-3 text-center text-sm font-bold text-primary hover:bg-secondary"
        >
          Xem tất cả thông báo
        </Link>
      </PopoverContent>
    </Popover>
  );
}
