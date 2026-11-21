import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client Supabase KHÔNG gắn kiểu sinh sẵn, dùng cho các bảng / hàm thêm ở migration 0009
 * (don_vi_to_chuc, binh_luan, luot_xem_bai_dang, bai_viet_noi_bat, tuong_tac_clb, ...).
 *
 * Lý do: src/integrations/supabase/types.ts do Lovable tự sinh theo CSDL ĐANG chạy. Trước khi
 * migration 0009 được áp dụng, file đó chưa có các bảng mới nên bản kiểm tra kiểu sẽ báo lỗi và
 * chặn Lovable chạy migration. Đi qua client này, code kiểm tra kiểu được với cả CSDL cũ lẫn mới;
 * kiểu dữ liệu trả về được khai báo tay ở nơi gọi (src/lib/data.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClientKhongKieu = SupabaseClient<any, "public", any>;

export const dbMoi = supabase as unknown as ClientKhongKieu;
