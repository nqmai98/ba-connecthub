import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Role = "student" | "club_rep" | "admin";
export const ROLE_LABEL: Record<Role, string> = {
  student: "Sinh viên",
  club_rep: "Đại diện CLB",
  admin: "Quản trị viên",
};
export const SCHOOL_DOMAIN = "@hvnh.edu.vn";
export const isSchoolEmail = (e: string) => e.trim().toLowerCase().endsWith(SCHOOL_DOMAIN);

type Profile = { id: string; full_name: string; email: string; is_locked: boolean };

type AuthCtx = {
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  roles: Role[];
  role: Role | null;
  clubIds: string[];
  ready: boolean;
  requireLogin: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function primaryRole(roles: Role[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("club_rep")) return "club_rep";
  return "student";
}
export function homePath(role: Role | null) {
  return role === "admin" ? "/admin" : role === "club_rep" ? "/clb" : "/";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clubIds, setClubIds] = useState<string[]>([]);
  const [infoLoaded, setInfoLoaded] = useState(false);
  const [askLogin, setAskLogin] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setSessionLoaded(true);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const uid = session?.user.id ?? null;

  const loadInfo = async (id: string) => {
    const [p, r, c] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, is_locked").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.from("club_reps").select("club_id").eq("user_id", id),
    ]);
    setProfile((p.data as Profile) ?? null);
    setRoles(((r.data ?? []) as { role: Role }[]).map((x) => x.role));
    setClubIds((c.data ?? []).map((x) => x.club_id));
    setInfoLoaded(true);
  };

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      setClubIds([]);
      setInfoLoaded(true);
      return;
    }
    setInfoLoaded(false);
    loadInfo(uid);
  }, [uid]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };

  const value: AuthCtx = {
    session,
    userId: uid,
    profile,
    roles,
    role: uid ? primaryRole(roles) : null,
    clubIds,
    ready: sessionLoaded && infoLoaded,
    requireLogin: () => setAskLogin(true),
    signOut,
    refresh: async () => {
      if (uid) await loadInfo(uid);
    },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <AlertDialog open={askLogin} onOpenChange={setAskLogin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn cần đăng nhập</AlertDialogTitle>
            <AlertDialogDescription>
              Vui lòng đăng nhập bằng email trường (@hvnh.edu.vn) để theo dõi câu lạc bộ và lưu sự kiện yêu thích.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Để sau</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link to="/dang-nhap" onClick={() => setAskLogin(false)}>
                Đăng nhập
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
