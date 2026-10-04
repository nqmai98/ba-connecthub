import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, type Club, type Post } from "@/lib/data";
import { Card, ClubLogo, Empty, EventCard, FollowButton } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/cau-lac-bo/$id")({
  head: () => ({
    meta: [
      { title: "Chi tiết câu lạc bộ – BA CLUBS" },
      { name: "description", content: "Giới thiệu, thành tích, tin tức và sự kiện của câu lạc bộ tại Học viện Ngân hàng." },
      { property: "og:title", content: "Chi tiết câu lạc bộ – BA CLUBS" },
      { property: "og:description", content: "Giới thiệu, thành tích, tin tức và sự kiện của câu lạc bộ." },
    ],
  }),
  component: ClubDetail,
});

function ClubDetail() {
  const { id } = Route.useParams();
  const club = useQuery({
    queryKey: ["club", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clubs").select("*, categories(name)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Club | null;
    },
  });
  const posts = useQuery({
    queryKey: ["club-posts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, clubs(id, name, logo_url)")
        .eq("club_id", id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });
  const followers = useQuery({
    queryKey: ["followers", id],
    queryFn: async () => (await supabase.rpc("club_follower_count", { _club_id: id })).data ?? 0,
  });

  if (club.isLoading)
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-3 py-8 sm:px-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </main>
    );
  const c = club.data;
  if (!c) return <main className="mx-auto max-w-xl px-4 py-16"><Empty text="Không tìm thấy câu lạc bộ" /></main>;

  const news = (posts.data ?? []).filter((p) => p.type === "news");
  const events = (posts.data ?? []).filter((p) => p.type === "event");
  const lines = (s: string) => s.split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8">
      <Link to="/cau-lac-bo" className="text-sm font-bold text-primary hover:underline">← Danh sách câu lạc bộ</Link>
      <Card className="mt-3 overflow-hidden p-0">
        {c.cover_url ? <img src={c.cover_url} alt="" className="h-40 w-full object-cover sm:h-56" /> : <div className="h-24 bg-primary" />}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ClubLogo club={c} size={80} />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl">{c.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-secondary-foreground">{c.categories?.name}</span>
                {c.founded_year && <span>Thành lập {c.founded_year}</span>}
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{followers.data ?? 0} người theo dõi</span>
              </div>
            </div>
          </div>
          <FollowButton clubId={c.id} className="h-10 px-5" />
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="mb-2 text-lg">Giới thiệu</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{c.description || c.short_intro}</p>
          {c.achievements && (
            <>
              <h2 className="mb-2 mt-5 text-lg">Thành tích nổi bật</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">{lines(c.achievements).map((a) => <li key={a}>{a}</li>)}</ul>
            </>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 text-lg">Ban chuyên môn</h2>
            <div className="flex flex-wrap gap-2">
              {lines(c.departments).map((d) => <span key={d} className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">{d}</span>)}
            </div>
          </Card>
          <Card>
            <h2 className="mb-2 text-lg">Liên hệ</h2>
            {c.contact_email && <a href={`mailto:${c.contact_email}`} className="flex items-center gap-2 text-sm font-bold text-primary"><Mail className="h-4 w-4" />{c.contact_email}</a>}
            {c.contact_info && <p className="mt-1 whitespace-pre-line text-sm">{c.contact_info}</p>}
          </Card>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl">Sự kiện</h2>
        {events.length ? <div className="grid gap-4 sm:grid-cols-2">{events.map((e) => <EventCard key={e.id} post={e} />)}</div> : <Empty text="Câu lạc bộ chưa có sự kiện" />}
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-xl">Tin tức</h2>
        {news.length ? (
          <div className="space-y-3">
            {news.map((n) => (
              <Card key={n.id}>
                <div className="text-xs font-semibold text-muted-foreground">{formatDateTime(n.created_at)}</div>
                <h3 className="mt-1 text-base">{n.title}</h3>
                {n.image_url && <img src={n.image_url} alt="" className="mt-3 max-h-72 w-full rounded-xl object-cover" loading="lazy" />}
                <p className="mt-2 whitespace-pre-line text-sm">{n.content}</p>
              </Card>
            ))}
          </div>
        ) : <Empty text="Câu lạc bộ chưa có tin tức" />}
      </section>
    </main>
  );
}
