export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bai_dang: {
        Row: {
          AnhBia: string | null
          LoaiBaiDang: string
          MaBaiDang: number
          MaCLB: number
          MaNguoiTao: string | null
          NgayDang: string | null
          NgayTao: string
          NoiDung: string
          TieuDe: string
          TrangThaiKiemDuyet: string
        }
        Insert: {
          AnhBia?: string | null
          LoaiBaiDang: string
          MaBaiDang?: never
          MaCLB: number
          MaNguoiTao?: string | null
          NgayDang?: string | null
          NgayTao?: string
          NoiDung: string
          TieuDe: string
          TrangThaiKiemDuyet?: string
        }
        Update: {
          AnhBia?: string | null
          LoaiBaiDang?: string
          MaBaiDang?: never
          MaCLB?: number
          MaNguoiTao?: string | null
          NgayDang?: string | null
          NgayTao?: string
          NoiDung?: string
          TieuDe?: string
          TrangThaiKiemDuyet?: string
        }
        Relationships: [
          {
            foreignKeyName: "bai_dang_MaCLB_fkey"
            columns: ["MaCLB"]
            isOneToOne: false
            referencedRelation: "cau_lac_bo"
            referencedColumns: ["MaCLB"]
          },
          {
            foreignKeyName: "bai_dang_MaNguoiTao_fkey"
            columns: ["MaNguoiTao"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
        ]
      }
      binh_luan: {
        Row: {
          MaBaiDang: number
          MaBinhLuan: number
          MaNguoiDung: string
          NoiDung: string
          ThoiGianTao: string
        }
        Insert: {
          MaBaiDang: number
          MaBinhLuan?: never
          MaNguoiDung: string
          NoiDung: string
          ThoiGianTao?: string
        }
        Update: {
          MaBaiDang?: number
          MaBinhLuan?: never
          MaNguoiDung?: string
          NoiDung?: string
          ThoiGianTao?: string
        }
        Relationships: [
          {
            foreignKeyName: "binh_luan_MaBaiDang_fkey"
            columns: ["MaBaiDang"]
            isOneToOne: false
            referencedRelation: "bai_dang"
            referencedColumns: ["MaBaiDang"]
          },
          {
            foreignKeyName: "binh_luan_MaNguoiDung_fkey"
            columns: ["MaNguoiDung"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
        ]
      }
      cau_lac_bo: {
        Row: {
          AnhBia: string | null
          BanChuyenMon: string | null
          DonViTrucThuoc: string | null
          Fanpage: string | null
          GioiThieuNgan: string | null
          LogoCLB: string | null
          MaCLB: number
          MaDonVi: number | null
          MaLinhVuc: number | null
          MoTa: string | null
          NamThanhLap: number | null
          NgayCapNhat: string
          NoiBat: boolean
          TenCLB: string
          ThanhTich: string | null
          ThongTinLienHe: string | null
          TrangThaiHoatDong: string
        }
        Insert: {
          AnhBia?: string | null
          BanChuyenMon?: string | null
          DonViTrucThuoc?: string | null
          Fanpage?: string | null
          GioiThieuNgan?: string | null
          LogoCLB?: string | null
          MaCLB?: never
          MaDonVi?: number | null
          MaLinhVuc?: number | null
          MoTa?: string | null
          NamThanhLap?: number | null
          NgayCapNhat?: string
          NoiBat?: boolean
          TenCLB: string
          ThanhTich?: string | null
          ThongTinLienHe?: string | null
          TrangThaiHoatDong?: string
        }
        Update: {
          AnhBia?: string | null
          BanChuyenMon?: string | null
          DonViTrucThuoc?: string | null
          Fanpage?: string | null
          GioiThieuNgan?: string | null
          LogoCLB?: string | null
          MaCLB?: never
          MaDonVi?: number | null
          MaLinhVuc?: number | null
          MoTa?: string | null
          NamThanhLap?: number | null
          NgayCapNhat?: string
          NoiBat?: boolean
          TenCLB?: string
          ThanhTich?: string | null
          ThongTinLienHe?: string | null
          TrangThaiHoatDong?: string
        }
        Relationships: [
          {
            foreignKeyName: "cau_lac_bo_MaDonVi_fkey"
            columns: ["MaDonVi"]
            isOneToOne: false
            referencedRelation: "don_vi_to_chuc"
            referencedColumns: ["MaDonVi"]
          },
          {
            foreignKeyName: "cau_lac_bo_MaLinhVuc_fkey"
            columns: ["MaLinhVuc"]
            isOneToOne: false
            referencedRelation: "linh_vuc"
            referencedColumns: ["MaLinhVuc"]
          },
        ]
      }
      don_vi_to_chuc: {
        Row: {
          Khoi: string
          MaDonVi: number
          MoTa: string | null
          TenDonVi: string
          ThuTu: number
        }
        Insert: {
          Khoi: string
          MaDonVi?: number
          MoTa?: string | null
          TenDonVi: string
          ThuTu?: number
        }
        Update: {
          Khoi?: string
          MaDonVi?: number
          MoTa?: string | null
          TenDonVi?: string
          ThuTu?: number
        }
        Relationships: []
      }
      kiem_duyet: {
        Row: {
          KetQuaKiemDuyet: string
          LyDoTuChoi: string | null
          MaBaiDang: number
          MaKiemDuyet: number
          MaQuanTriVien: string
          ThoiGianKiemDuyet: string
        }
        Insert: {
          KetQuaKiemDuyet: string
          LyDoTuChoi?: string | null
          MaBaiDang: number
          MaKiemDuyet?: never
          MaQuanTriVien: string
          ThoiGianKiemDuyet?: string
        }
        Update: {
          KetQuaKiemDuyet?: string
          LyDoTuChoi?: string | null
          MaBaiDang?: number
          MaKiemDuyet?: never
          MaQuanTriVien?: string
          ThoiGianKiemDuyet?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiem_duyet_MaBaiDang_fkey"
            columns: ["MaBaiDang"]
            isOneToOne: false
            referencedRelation: "bai_dang"
            referencedColumns: ["MaBaiDang"]
          },
          {
            foreignKeyName: "kiem_duyet_MaQuanTriVien_fkey"
            columns: ["MaQuanTriVien"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
        ]
      }
      linh_vuc: {
        Row: {
          MaLinhVuc: number
          MoTa: string | null
          TenLinhVuc: string
        }
        Insert: {
          MaLinhVuc?: never
          MoTa?: string | null
          TenLinhVuc: string
        }
        Update: {
          MaLinhVuc?: never
          MoTa?: string | null
          TenLinhVuc?: string
        }
        Relationships: []
      }
      luot_xem_bai_dang: {
        Row: {
          MaBaiDang: number
          MaLuotXem: number
          MaNguoiDung: string | null
          ThoiGianXem: string
        }
        Insert: {
          MaBaiDang: number
          MaLuotXem?: never
          MaNguoiDung?: string | null
          ThoiGianXem?: string
        }
        Update: {
          MaBaiDang?: number
          MaLuotXem?: never
          MaNguoiDung?: string | null
          ThoiGianXem?: string
        }
        Relationships: [
          {
            foreignKeyName: "luot_xem_bai_dang_MaBaiDang_fkey"
            columns: ["MaBaiDang"]
            isOneToOne: false
            referencedRelation: "bai_dang"
            referencedColumns: ["MaBaiDang"]
          },
          {
            foreignKeyName: "luot_xem_bai_dang_MaNguoiDung_fkey"
            columns: ["MaNguoiDung"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
        ]
      }
      nguoi_dung: {
        Row: {
          EmailTruong: string
          HoTen: string
          MaCLB: number | null
          MaNguoiDung: string
          MaVaiTro: number
          NgayCapTaiKhoan: string
          SoDienThoai: string | null
          TenDangNhap: string | null
          TrangThaiTaiKhoan: string
        }
        Insert: {
          EmailTruong: string
          HoTen?: string
          MaCLB?: number | null
          MaNguoiDung: string
          MaVaiTro: number
          NgayCapTaiKhoan?: string
          SoDienThoai?: string | null
          TenDangNhap?: string | null
          TrangThaiTaiKhoan?: string
        }
        Update: {
          EmailTruong?: string
          HoTen?: string
          MaCLB?: number | null
          MaNguoiDung?: string
          MaVaiTro?: number
          NgayCapTaiKhoan?: string
          SoDienThoai?: string | null
          TenDangNhap?: string | null
          TrangThaiTaiKhoan?: string
        }
        Relationships: [
          {
            foreignKeyName: "nguoi_dung_MaCLB_fkey"
            columns: ["MaCLB"]
            isOneToOne: true
            referencedRelation: "cau_lac_bo"
            referencedColumns: ["MaCLB"]
          },
          {
            foreignKeyName: "nguoi_dung_MaVaiTro_fkey"
            columns: ["MaVaiTro"]
            isOneToOne: false
            referencedRelation: "vai_tro"
            referencedColumns: ["MaVaiTro"]
          },
        ]
      }
      nguoi_nhan_thong_bao: {
        Row: {
          DaDoc: boolean
          MaNguoiDung: string
          MaThongBao: number
          ThoiGianDoc: string | null
        }
        Insert: {
          DaDoc?: boolean
          MaNguoiDung: string
          MaThongBao: number
          ThoiGianDoc?: string | null
        }
        Update: {
          DaDoc?: boolean
          MaNguoiDung?: string
          MaThongBao?: number
          ThoiGianDoc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nguoi_nhan_thong_bao_MaNguoiDung_fkey"
            columns: ["MaNguoiDung"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
          {
            foreignKeyName: "nguoi_nhan_thong_bao_MaThongBao_fkey"
            columns: ["MaThongBao"]
            isOneToOne: false
            referencedRelation: "thong_bao"
            referencedColumns: ["MaThongBao"]
          },
        ]
      }
      nhat_ky_hoat_dong: {
        Row: {
          DoiTuongTacDong: string | null
          GiaTriCu: string | null
          GiaTriMoi: string | null
          HanhDong: string
          MaDoiTuong: number | null
          MaNguoiDung: string
          MaNhatKy: number
          ThoiGian: string
        }
        Insert: {
          DoiTuongTacDong?: string | null
          GiaTriCu?: string | null
          GiaTriMoi?: string | null
          HanhDong: string
          MaDoiTuong?: number | null
          MaNguoiDung: string
          MaNhatKy?: never
          ThoiGian?: string
        }
        Update: {
          DoiTuongTacDong?: string | null
          GiaTriCu?: string | null
          GiaTriMoi?: string | null
          HanhDong?: string
          MaDoiTuong?: number | null
          MaNguoiDung?: string
          MaNhatKy?: never
          ThoiGian?: string
        }
        Relationships: [
          {
            foreignKeyName: "nhat_ky_hoat_dong_MaNguoiDung_fkey"
            columns: ["MaNguoiDung"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
        ]
      }
      su_kien: {
        Row: {
          DiaDiem: string | null
          LoaiSuKien: string
          MaBaiDang: number
          ThoiGianBatDau: string
          ThoiGianKetThuc: string
          TrangThaiDienRa: string
        }
        Insert: {
          DiaDiem?: string | null
          LoaiSuKien: string
          MaBaiDang: number
          ThoiGianBatDau: string
          ThoiGianKetThuc: string
          TrangThaiDienRa?: string
        }
        Update: {
          DiaDiem?: string | null
          LoaiSuKien?: string
          MaBaiDang?: number
          ThoiGianBatDau?: string
          ThoiGianKetThuc?: string
          TrangThaiDienRa?: string
        }
        Relationships: [
          {
            foreignKeyName: "su_kien_MaBaiDang_fkey"
            columns: ["MaBaiDang"]
            isOneToOne: true
            referencedRelation: "bai_dang"
            referencedColumns: ["MaBaiDang"]
          },
        ]
      }
      theo_doi_clb: {
        Row: {
          BatThongBao: boolean
          MaCLB: number
          MaNguoiDung: string
          NgayTheoDoi: string
        }
        Insert: {
          BatThongBao?: boolean
          MaCLB: number
          MaNguoiDung: string
          NgayTheoDoi?: string
        }
        Update: {
          BatThongBao?: boolean
          MaCLB?: number
          MaNguoiDung?: string
          NgayTheoDoi?: string
        }
        Relationships: [
          {
            foreignKeyName: "theo_doi_clb_MaCLB_fkey"
            columns: ["MaCLB"]
            isOneToOne: false
            referencedRelation: "cau_lac_bo"
            referencedColumns: ["MaCLB"]
          },
          {
            foreignKeyName: "theo_doi_clb_MaNguoiDung_fkey"
            columns: ["MaNguoiDung"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
        ]
      }
      thong_bao: {
        Row: {
          DuongDan: string | null
          LoaiThongBao: string
          MaThongBao: number
          NoiDung: string
          ThoiGianTao: string
          TieuDe: string
        }
        Insert: {
          DuongDan?: string | null
          LoaiThongBao: string
          MaThongBao?: never
          NoiDung: string
          ThoiGianTao?: string
          TieuDe: string
        }
        Update: {
          DuongDan?: string | null
          LoaiThongBao?: string
          MaThongBao?: never
          NoiDung?: string
          ThoiGianTao?: string
          TieuDe?: string
        }
        Relationships: []
      }
      thong_ke_truy_cap: {
        Row: {
          LuotTruyCap: number
          MaThongKe: number
        }
        Insert: {
          LuotTruyCap?: number
          MaThongKe?: number
        }
        Update: {
          LuotTruyCap?: number
          MaThongKe?: number
        }
        Relationships: []
      }
      vai_tro: {
        Row: {
          MaVaiTro: number
          MoTaQuyen: string | null
          TenVaiTro: string
        }
        Insert: {
          MaVaiTro?: never
          MoTaQuyen?: string | null
          TenVaiTro: string
        }
        Update: {
          MaVaiTro?: never
          MoTaQuyen?: string | null
          TenVaiTro?: string
        }
        Relationships: []
      }
      yeu_cau_cap_nhat: {
        Row: {
          LyDoTuChoi: string | null
          MaCLB: number
          MaQuanTriVien: string | null
          MaYeuCau: number
          NoiDungThayDoi: string
          ThoiGianGui: string
          ThoiGianXuLy: string | null
          TrangThaiXuLy: string
        }
        Insert: {
          LyDoTuChoi?: string | null
          MaCLB: number
          MaQuanTriVien?: string | null
          MaYeuCau?: never
          NoiDungThayDoi: string
          ThoiGianGui?: string
          ThoiGianXuLy?: string | null
          TrangThaiXuLy?: string
        }
        Update: {
          LyDoTuChoi?: string | null
          MaCLB?: number
          MaQuanTriVien?: string | null
          MaYeuCau?: never
          NoiDungThayDoi?: string
          ThoiGianGui?: string
          ThoiGianXuLy?: string | null
          TrangThaiXuLy?: string
        }
        Relationships: [
          {
            foreignKeyName: "yeu_cau_cap_nhat_MaCLB_fkey"
            columns: ["MaCLB"]
            isOneToOne: false
            referencedRelation: "cau_lac_bo"
            referencedColumns: ["MaCLB"]
          },
          {
            foreignKeyName: "yeu_cau_cap_nhat_MaQuanTriVien_fkey"
            columns: ["MaQuanTriVien"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
        ]
      }
      yeu_thich_su_kien: {
        Row: {
          MaBaiDang: number
          MaNguoiDung: string
          NgayYeuThich: string
        }
        Insert: {
          MaBaiDang: number
          MaNguoiDung: string
          NgayYeuThich?: string
        }
        Update: {
          MaBaiDang?: number
          MaNguoiDung?: string
          NgayYeuThich?: string
        }
        Relationships: [
          {
            foreignKeyName: "yeu_thich_su_kien_MaBaiDang_fkey"
            columns: ["MaBaiDang"]
            isOneToOne: false
            referencedRelation: "su_kien"
            referencedColumns: ["MaBaiDang"]
          },
          {
            foreignKeyName: "yeu_thich_su_kien_MaNguoiDung_fkey"
            columns: ["MaNguoiDung"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["MaNguoiDung"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bai_dang_xem_duoc: {
        Args: { _ma_bai_dang: number; _ma_nguoi_dung: string }
        Returns: boolean
      }
      bai_viet_noi_bat: {
        Args: { _gioi_han?: number; _so_ngay?: number }
        Returns: {
          DiemNoiBat: number
          LuotBinhLuan: number
          LuotXem: number
          LuotYeuThich: number
          MaBaiDang: number
        }[]
      }
      binh_luan_cua_bai: {
        Args: { _ma_bai_dang: number }
        Returns: {
          CoTheXoa: boolean
          CuaToi: boolean
          HoTen: string
          MaBinhLuan: number
          NoiDung: string
          ThoiGianTao: string
          VaiTro: string
        }[]
      }
      bo_dau: { Args: { _s: string }; Returns: string }
      clb_phu_trach: { Args: { _ma_nguoi_dung: string }; Returns: number }
      co_vai_tro: {
        Args: { _ma_nguoi_dung: string; _ten_vai_tro: string }
        Returns: boolean
      }
      dem_nguoi_theo_doi: { Args: { _ma_clb: number }; Returns: number }
      dem_tuong_tac: {
        Args: { _ds_bai_dang: number[] }
        Returns: {
          LuotBinhLuan: number
          LuotXem: number
          LuotYeuThich: number
          MaBaiDang: number
        }[]
      }
      doan_don_vi: { Args: { _khoi?: string; _ten: string }; Returns: number }
      ghi_luot_xem: { Args: { _ma_bai_dang: number }; Returns: undefined }
      ghi_nhan_truy_cap: { Args: never; Returns: undefined }
      ghi_nhat_ky: {
        Args: {
          _doi_tuong: string
          _gia_tri_cu: string
          _gia_tri_moi: string
          _hanh_dong: string
          _ma_doi_tuong: number
        }
        Returns: undefined
      }
      gui_thong_bao: {
        Args: {
          _duong_dan: string
          _loai: string
          _nguoi_nhan: string[]
          _noi_dung: string
          _tieu_de: string
        }
        Returns: number
      }
      khoi_tao_so_do_to_chuc: { Args: never; Returns: Json }
      la_dai_dien_bai_dang: {
        Args: { _ma_bai_dang: number; _ma_nguoi_dung: string }
        Returns: boolean
      }
      la_dai_dien_clb: {
        Args: { _ma_clb: number; _ma_nguoi_dung: string }
        Returns: boolean
      }
      la_quan_tri_vien: { Args: { _ma_nguoi_dung: string }; Returns: boolean }
      lam_moi_trang_thai_su_kien: { Args: never; Returns: undefined }
      luot_yeu_thich_clb: {
        Args: { _ma_clb: number }
        Returns: {
          MaBaiDang: number
          NgayYeuThich: string
        }[]
      }
      nhan_don_vi: { Args: { _ma_don_vi: number }; Returns: string }
      su_kien_noi_bat: {
        Args: { _gioi_han?: number }
        Returns: {
          DiemNoiBat: number
          LuotYeuThich: number
          MaBaiDang: number
        }[]
      }
      tai_khoan_hoat_dong: {
        Args: { _ma_nguoi_dung: string }
        Returns: boolean
      }
      tu_choi_bai_dang: {
        Args: { _ly_do: string; _ma_bai_dang: number }
        Returns: undefined
      }
      tuong_tac_clb: {
        Args: { _ma_clb: number }
        Returns: {
          LuotBinhLuan: number
          LuotXem: number
          LuotYeuThich: number
          MaBaiDang: number
          Ngay: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
