import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";
import { useCategories, useClubs } from "@/lib/data";
import { ClubCard, Empty, GridSkeleton, Page } from "@/components/common";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const search = z.object({ q: z.string().optional(), linh_vuc: z.string().optional() });

export const Route = createFileRoute("/cau-lac-bo/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Danh sách câu lạc bộ – BA CLUBS" },
      { name: "description", content: "Tìm kiếm câu lạc bộ theo tên và lĩnh vực tại Học viện Ngân hàng." },
      { property: "og:title", content: "Danh sách câu lạc bộ – BA CLUBS" },
      { property: "og:description", content: "Tìm kiếm câu lạc bộ theo tên và lĩnh vực tại Học viện Ngân hàng." },
    ],
  }),
  component: ClubList,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();

function ClubList() {
  const { q = "", linh_vuc } = Route.useSearch();
  const navigate = useNavigate({ from: "/cau-lac-bo/" });
  const { data: cats } = useCategories();
  const { data: clubs, isLoading } = useClubs();

  const list = useMemo(() => {
    const k = norm(q.trim());
    return (clubs ?? []).filter(
      (c) =>
        c.is_active &&
        (!linh_vuc || c.category_id === linh_vuc) &&
        (!k || norm(`${c.name} ${c.short_intro} ${c.description}`).includes(k)),
    );
  }, [clubs, q, linh_vuc]);

  const chip = (active: boolean) =>
    cn("shrink-0 rounded-full border px-4 py-2 text-sm font-bold", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-primary hover:bg-secondary");

  return (
    <Page title="Câu lạc bộ" subtitle="Khám phá các câu lạc bộ, đội nhóm tại Học viện Ngân hàng">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => navigate({ search: (p) => ({ ...p, q: e.target.value || undefined }), replace: true })}
          placeholder="Tìm theo tên hoặc từ khóa..."
          className="h-12 rounded-xl bg-card pl-10 text-base"
        />
      </div>
      <div className="scrollbar-none mb-6 flex gap-2 overflow-x-auto pb-1">
        <button className={chip(!linh_vuc)} onClick={() => navigate({ search: (p) => ({ ...p, linh_vuc: undefined }) })}>Tất cả</button>
        {(cats ?? []).map((c) => (
          <button key={c.id} className={chip(linh_vuc === c.id)} onClick={() => navigate({ search: (p) => ({ ...p, linh_vuc: c.id }) })}>
            {c.name}
          </button>
        ))}
      </div>
      {isLoading ? <GridSkeleton /> : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <ClubCard key={c.id} club={c} />)}</div>
      ) : (
        <Empty text="Không tìm thấy câu lạc bộ phù hợp" />
      )}
    </Page>
  );
}
