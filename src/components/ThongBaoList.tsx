import { useNavigate } from "@tanstack/react-router";
import { Bell, BellRing, CalendarCheck, FileCheck2, Info } from "lucide-react";
import {
  formatDateTime,
  useDanhDauDaDoc,
  useThongBao,
  type LoaiThongBao,
  type ThongBaoCuaToi,
} from "@/lib/data";
import { Empty, GridSkeleton, Page } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Trang danh sách thông báo dùng chung cho khu Sinh viên (/thong-bao) và Quản trị (/admin/thong-bao). */
const ICON: Record<LoaiThongBao, typeof Bell> = {
  DuyetBaiDang: FileCheck2,
  CLBCapNhat: BellRing,
  YeuCauCapNhat: CalendarCheck,
  HeThong: Info,
};

export function ThongBaoList() {
  const { data, isLoading } = useThongBao();
  const danhDau = useDanhDauDaDoc();
  const navigate = useNavigate();

  const open = async (n: ThongBaoCuaToi) => {
    if (!n.DaDoc) await danhDau.mutateAsync(n.MaThongBao);
    if (n.DuongDan) navigate({ to: n.DuongDan });
  };

  return (
    <Page
      title="Thông báo"
      actions={
        data?.some((n) => !n.DaDoc) ? (
          <Button variant="outline" onClick={() => danhDau.mutate(undefined)}>
            Đánh dấu đã đọc tất cả
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <GridSkeleton n={3} />
      ) : data?.length ? (
        <div className="space-y-2">
          {data.map((n) => {
            const Icon = ICON[n.LoaiThongBao] ?? Bell;
            return (
              <button
                key={n.MaThongBao}
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left hover:border-primary",
                  !n.DaDoc && "border-l-4 border-l-accent",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    n.DaDoc ? "text-muted-foreground" : "text-accent",
                  )}
                />
                <div className="min-w-0">
                  <p className={cn("text-sm", !n.DaDoc && "font-bold")}>{n.TieuDe}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.NoiDung}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {formatDateTime(n.ThoiGianTao)}
                    {n.DaDoc && n.ThoiGianDoc && ` · đã đọc ${formatDateTime(n.ThoiGianDoc)}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty text="Bạn chưa có thông báo nào" />
      )}
    </Page>
  );
}
