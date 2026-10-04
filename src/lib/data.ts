import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Category = { id: string; name: string };
export type Club = {
  id: string;
  name: string;
  category_id: string | null;
  short_intro: string;
  description: string;
  founded_year: number | null;
  departments: string;
  achievements: string;
  contact_email: string;
  contact_info: string;
  logo_url: string | null;
  cover_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  categories?: { name: string } | null;
};
export type Post = {
  id: string;
  club_id: string;
  type: "news" | "event";
  title: string;
  content: string;
  image_url: string | null;
  event_time: string | null;
  location: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
  clubs?: { id: string; name: string; logo_url: string | null } | null;
};

export const STATUS_LABEL = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Bị từ chối" } as const;

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useClubs() {
  return useQuery({
    queryKey: ["clubs"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*, categories(name)")
        .order("name");
      if (error) throw error;
      return data as Club[];
    },
  });
}

export function useEvents(opts: { upcoming?: boolean; clubId?: string } = {}) {
  return useQuery({
    queryKey: ["events", opts],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select("*, clubs(id, name, logo_url)")
        .eq("status", "approved")
        .eq("type", "event")
        .order("event_time", { ascending: true });
      if (opts.upcoming) q = q.gte("event_time", new Date().toISOString());
      if (opts.clubId) q = q.eq("club_id", opts.clubId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Post[];
    },
  });
}

export function useFollows() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["follows", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("club_id").eq("user_id", userId!);
      if (error) throw error;
      return new Set(data.map((d) => d.club_id));
    },
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async ({ clubId, follow }: { clubId: string; follow: boolean }) => {
      const r = follow
        ? await supabase.from("follows").insert({ user_id: userId!, club_id: clubId })
        : await supabase.from("follows").delete().eq("user_id", userId!).eq("club_id", clubId);
      if (r.error) throw r.error;
      return follow;
    },
    onSuccess: (follow) => {
      toast.success(follow ? "Đã theo dõi câu lạc bộ" : "Đã bỏ theo dõi câu lạc bộ");
      qc.invalidateQueries({ queryKey: ["follows"] });
      qc.invalidateQueries({ queryKey: ["followers"] });
    },
    onError: () => toast.error("Thao tác thất bại, vui lòng thử lại"),
  });
}

export function useFavorites() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_events")
        .select("post_id, posts(*, clubs(id, name, logo_url))")
        .eq("user_id", userId!);
      if (error) throw error;
      return data.map((d) => d.posts as unknown as Post).filter(Boolean);
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async ({ postId, fav }: { postId: string; fav: boolean }) => {
      const r = fav
        ? await supabase.from("favorite_events").insert({ user_id: userId!, post_id: postId })
        : await supabase.from("favorite_events").delete().eq("user_id", userId!).eq("post_id", postId);
      if (r.error) throw r.error;
      return fav;
    },
    onSuccess: (fav) => {
      toast.success(fav ? "Đã lưu sự kiện vào lịch cá nhân" : "Đã xóa sự kiện khỏi lịch cá nhân");
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Thao tác thất bại, vui lòng thử lại"),
  });
}

export function useNotifications() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export async function uploadImage(file: File, userId: string) {
  if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh tối đa 5MB");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const signed = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
