import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useYeuThich } from "@/lib/data";
import { Card, Empty, EventCard, GridSkeleton, Page, RoleGate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lich-ca-nhan")({
  head: () => ({
    meta: [
      { title: "Lịch cá nhân – BA CLUBS" },
      { name: "description", content: "Lịch các sự kiện bạn đã yêu thích." },
      { property: "og:title", content: "Lịch cá nhân – BA CLUBS" },
      { property: "og:description", content: "Lịch các sự kiện bạn đã yêu thích." },
    ],
  }),
  component: () => (
    <RoleGate>
      <Calendar />
    </RoleGate>
  ),
});

function Calendar() {
  const { data, isLoading } = useYeuThich();
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const events = useMemo(
    () => (data ?? []).slice().sort((a, b) => a.ThoiGianBatDau.localeCompare(b.ThoiGianBatDau)),
    [data],
  );
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  /** Sự kiện chiếm mọi ngày từ ThoiGianBatDau đến ThoiGianKetThuc. */
  const trongNgay = (d: Date) =>
    events.filter((e) => {
      const batDau = new Date(e.ThoiGianBatDau);
      const ketThuc = new Date(e.ThoiGianKetThuc);
      return (batDau <= d || isSameDay(batDau, d)) && (ketThuc >= d || isSameDay(ketThuc, d));
    });

  const dayEvents = selected ? trongNgay(selected) : [];
  const tab = (a: boolean) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-bold",
      a ? "bg-primary text-primary-foreground" : "border bg-card text-primary",
    );

  return (
    <Page
      title="Lịch cá nhân"
      subtitle="Các sự kiện bạn đã yêu thích"
      actions={
        <div className="flex gap-2">
          <button className={tab(view === "month")} onClick={() => setView("month")}>
            Dạng lịch
          </button>
          <button className={tab(view === "list")} onClick={() => setView("list")}>
            Danh sách
          </button>
        </div>
      }
    >
      {isLoading ? (
        <GridSkeleton n={3} />
      ) : !events.length ? (
        <Empty
          text="Bạn chưa lưu sự kiện nào"
          action={
            <Button asChild>
              <Link to="/su-kien">Khám phá sự kiện</Link>
            </Button>
          }
        />
      ) : view === "list" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.MaBaiDang} suKien={e} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-3 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMonth(addMonths(month, -1))}
                aria-label="Tháng trước"
              >
                <ChevronLeft />
              </Button>
              <h2 className="text-lg capitalize">{format(month, "LLLL yyyy", { locale: vi })}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMonth(addMonths(month, 1))}
                aria-label="Tháng sau"
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const evs = trongNgay(d);
                const sel = selected && isSameDay(d, selected);
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelected(d)}
                    className={cn(
                      "flex min-h-14 flex-col items-start rounded-lg border p-1 text-left text-xs sm:min-h-20 sm:p-1.5",
                      !isSameMonth(d, month) && "opacity-40",
                      isSameDay(d, new Date()) && "border-primary",
                      sel && "bg-secondary",
                    )}
                  >
                    <span className="font-bold">{format(d, "d")}</span>
                    {evs.slice(0, 2).map((e) => (
                      <span
                        key={e.MaBaiDang}
                        className="mt-0.5 hidden w-full truncate rounded bg-accent px-1 text-[10px] font-bold text-accent-foreground sm:block"
                      >
                        {e.TieuDe}
                      </span>
                    ))}
                    {evs.length > 0 && (
                      <span className="mt-auto h-1.5 w-1.5 rounded-full bg-accent sm:hidden" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
          {selected && (
            <div>
              <h3 className="mb-3 text-base">Sự kiện ngày {format(selected, "dd/MM/yyyy")}</h3>
              {dayEvents.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dayEvents.map((e) => (
                    <EventCard key={e.MaBaiDang} suKien={e} />
                  ))}
                </div>
              ) : (
                <Empty text="Không có sự kiện trong ngày này" />
              )}
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
