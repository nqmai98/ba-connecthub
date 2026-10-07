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

/**
 * Vai trò lấy từ bảng vai_tro. Theo thiết kế, quan hệ VAI_TRO – NGUOI_DUNG là 1–n:
 * mỗi tài khoản có đúng MỘT vai trò (khoá ngoại MaVaiTro), không phải danh sách vai trò.
 */
export type TenVaiTro = "SinhVien" | "DaiDienCLB" | "QuanTriVien";

export const NHAN_VAI_TRO: Record<TenVaiTro, string> = {
  SinhVien: "Sinh viên",
  DaiDienCLB: "Đại diện CLB",
  QuanTriVien: "Quản trị viên",
};

export type TrangThaiTaiKhoan = "HoatDong" | "BiKhoa";

export const SCHOOL_DOMAIN = "@hvnh.edu.vn";
export const isSchoolEmail = (e: string) => e.trim().toLowerCase().endsWith(SCHOOL_DOMAIN);

export type NguoiDung = {
  MaNguoiDung: string;
  HoTen: string;
  EmailTruong: string;
  SoDienThoai: string | null;
  MaVaiTro: number;
  MaCLB: number | null;
  TrangThaiTaiKhoan: TrangThaiTaiKhoan;
  NgayCapTaiKhoan: string;
  TenDangNhap: string | null;
  vai_tro?: { TenVaiTro: string } | null;
};

type AuthCtx = {
  session: Session | null;
  maNguoiDung: string | null;
  nguoiDung: NguoiDung | null;
  vaiTro: TenVaiTro | null;
  /** Mã CLB mà tài khoản phụ trách – chỉ có giá trị với vai trò Đại diện CLB. */
  maCLB: number | null;
  biKhoa: boolean;
  ready: boolean;
  requireLogin: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function homePath(vaiTro: TenVaiTro | null) {
  return vaiTro === "QuanTriVien" ? "/admin" : vaiTro === "DaiDienCLB" ? "/clb" : "/";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [nguoiDung, setNguoiDung] = useState<NguoiDung | null>(null);
  const [vaiTro, setVaiTro] = useState<TenVaiTro | null>(null);
  const [infoFor, setInfoFor] = useState<string | null | undefined>(undefined);
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
    const { data } = await supabase
      .from("nguoi_dung")
      .select("*, vai_tro(TenVaiTro)")
      .eq("MaNguoiDung", id)
      .maybeSingle();
    const row = (data as unknown as NguoiDung | null) ?? null;
    setNguoiDung(row);
    setVaiTro((row?.vai_tro?.TenVaiTro as TenVaiTro | undefined) ?? null);
    setInfoFor(id);
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (!uid) {
      setNguoiDung(null);
      setVaiTro(null);
      setInfoFor(null);
      return;
    }
    loadInfo(uid);
  }, [uid]);

  const value: AuthCtx = {
    session,
    maNguoiDung: uid,
    nguoiDung,
    vaiTro: uid ? vaiTro : null,
    maCLB: vaiTro === "DaiDienCLB" ? (nguoiDung?.MaCLB ?? null) : null,
    biKhoa: nguoiDung?.TrangThaiTaiKhoan === "BiKhoa",
    ready: sessionLoaded && infoFor === uid,
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
              Vui lòng đăng nhập bằng email trường (@hvnh.edu.vn) để theo dõi câu lạc bộ và lưu sự
              kiện yêu thích.
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
