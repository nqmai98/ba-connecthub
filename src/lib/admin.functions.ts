import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { USERNAME_HINT, USERNAME_REGEX, usernameToEmail } from "@/lib/club-account";

const schema = z.object({
  // Có maCLB: cấp tài khoản cho CLB đã tồn tại. Không có: tạo CLB mới từ clubName.
  maCLB: z.number().int().positive().optional(),
  clubName: z.string().trim().min(2, "Vui lòng nhập tên đầy đủ CLB").max(255),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_REGEX, "Username không hợp lệ: " + USERNAME_HINT),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72),
});

export const createClubAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("la_quan_tri_vien", {
      _ma_nguoi_dung: context.userId,
    });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const taken = await supabaseAdmin
      .from("nguoi_dung")
      .select("MaNguoiDung")
      .eq("TenDangNhap", data.username)
      .maybeSingle();
    if (taken.data) throw new Error("Username này đã tồn tại");

    let maCLB = data.maCLB;
    let createdClub = false;
    if (maCLB) {
      const c = await supabaseAdmin
        .from("cau_lac_bo")
        .select("MaCLB")
        .eq("MaCLB", maCLB)
        .maybeSingle();
      if (!c.data) throw new Error("Không tìm thấy câu lạc bộ");
      // Quan hệ 1–1: một CLB chỉ có một tài khoản đại diện
      const daCo = await supabaseAdmin
        .from("nguoi_dung")
        .select("MaNguoiDung")
        .eq("MaCLB", maCLB)
        .maybeSingle();
      if (daCo.data) throw new Error("Câu lạc bộ này đã có tài khoản đại diện");
    } else {
      const dup = await supabaseAdmin
        .from("cau_lac_bo")
        .select("MaCLB")
        .eq("TenCLB", data.clubName)
        .maybeSingle();
      if (dup.data)
        throw new Error("Đã có CLB trùng tên. Hãy cấp tài khoản từ danh sách CLB bên dưới");

      // Đơn vị trong sơ đồ Đoàn – Hội được CSDL tự đoán theo tên CLB (trigger cau_lac_bo_don_vi_trg);
      // Quản trị viên chỉnh lại trong Quản lý CLB nếu cần.
      const ins = await supabaseAdmin
        .from("cau_lac_bo")
        // Không kèm MaDonVi: CSDL tự đoán đơn vị theo tên (sau migration 0009)
        .insert({ TenCLB: data.clubName } as never)
        .select("MaCLB")
        .single();
      if (ins.error || !ins.data)
        throw new Error("Tạo CLB thất bại: " + (ins.error?.message ?? ""));
      maCLB = ins.data.MaCLB;
      createdClub = true;
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.clubName },
    });

    const removeClubIfNew = async () => {
      if (createdClub && maCLB) await supabaseAdmin.from("cau_lac_bo").delete().eq("MaCLB", maCLB);
    };
    if (error || !created?.user) {
      await removeClubIfNew();
      const m = (error?.message ?? "").toLowerCase();
      if (m.includes("registered") || m.includes("already"))
        throw new Error("Username này đã tồn tại");
      throw new Error("Tạo tài khoản thất bại: " + (error?.message ?? "không rõ nguyên nhân"));
    }

    // Trigger chỉ tạo nguoi_dung với vai trò SinhVien; gán vai trò và CLB sau khi user tồn tại
    const uid = created.user.id;
    const vaiTro = await supabaseAdmin
      .from("vai_tro")
      .select("MaVaiTro")
      .eq("TenVaiTro", "DaiDienCLB")
      .maybeSingle();
    if (!vaiTro.data) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      await removeClubIfNew();
      throw new Error("Thiếu vai trò DaiDienCLB trong bảng vai_tro");
    }

    const capNhat = await supabaseAdmin
      .from("nguoi_dung")
      .update({
        TenDangNhap: data.username,
        HoTen: data.clubName,
        MaVaiTro: vaiTro.data.MaVaiTro,
        MaCLB: maCLB!,
      })
      .eq("MaNguoiDung", uid);

    if (capNhat.error) {
      // Hoàn tác để không để lại tài khoản dở dang
      await supabaseAdmin.from("nguoi_dung").delete().eq("MaNguoiDung", uid);
      await supabaseAdmin.auth.admin.deleteUser(uid);
      await removeClubIfNew();
      throw new Error("Gán quyền cho tài khoản CLB thất bại: " + capNhat.error.message);
    }
    return { ok: true as const, maCLB: maCLB! };
  });

/**
 * Xóa hồ sơ CLB: xóa bản ghi cau_lac_bo (ON DELETE CASCADE kéo theo bai_dang, su_kien,
 * kiem_duyet, theo_doi_clb, yeu_thich_su_kien, yeu_cau_cap_nhat) và xóa luôn tài khoản
 * đại diện của CLB đó.
 */
export const deleteClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ maCLB: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("la_quan_tri_vien", {
      _ma_nguoi_dung: context.userId,
    });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const club = await supabaseAdmin
      .from("cau_lac_bo")
      .select("MaCLB")
      .eq("MaCLB", data.maCLB)
      .maybeSingle();
    if (!club.data) throw new Error("Không tìm thấy câu lạc bộ (có thể đã được xóa)");

    const rep = await supabaseAdmin
      .from("nguoi_dung")
      .select("MaNguoiDung, MaVaiTro, vai_tro(TenVaiTro)")
      .eq("MaCLB", data.maCLB)
      .maybeSingle();

    const repRow = rep.data as unknown as {
      MaNguoiDung: string;
      vai_tro: { TenVaiTro: string } | null;
    } | null;
    const xoaTaiKhoan =
      repRow && repRow.vai_tro?.TenVaiTro !== "QuanTriVien" ? repRow.MaNguoiDung : null;

    // bai_dang."MaNguoiTao" là ON DELETE SET NULL, nhưng kiem_duyet."MaQuanTriVien" là
    // ON DELETE RESTRICT: xoá CLB trước để mọi bản ghi phụ thuộc biến mất.
    const del = await supabaseAdmin.from("cau_lac_bo").delete().eq("MaCLB", data.maCLB);
    if (del.error) throw new Error("Xóa CLB thất bại: " + del.error.message);

    if (xoaTaiKhoan) {
      await supabaseAdmin.from("nguoi_nhan_thong_bao").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.from("theo_doi_clb").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.from("yeu_thich_su_kien").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.from("nhat_ky_hoat_dong").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.from("nguoi_dung").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.auth.admin.deleteUser(xoaTaiKhoan);
    }
    return { ok: true as const, removedAccounts: xoaTaiKhoan ? 1 : 0 };
  });

/**
 * Xóa tài khoản người dùng khỏi BAV CLUBS (chỉ Quản trị viên):
 *  - Xóa bản ghi trong hệ thống đăng nhập (auth.users); nguoi_dung và dữ liệu cá nhân đi kèm
 *    (theo dõi CLB, yêu thích sự kiện, thông báo, nhật ký) bị xóa theo nhờ ON DELETE CASCADE.
 *  - KHÔNG ảnh hưởng tài khoản Google của sinh viên: nếu họ đăng nhập lại bằng Google sẽ được
 *    tạo một tài khoản Sinh viên mới, trống. Muốn chặn hẳn thì dùng "Khóa" thay vì xóa.
 *  - Không cho xóa chính mình và không cho xóa Quản trị viên (lịch sử kiểm duyệt gắn với họ).
 *  - Xóa tài khoản Đại diện CLB: CLB vẫn giữ nguyên, chỉ chuyển sang "chưa có tài khoản".
 */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ maNguoiDung: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("la_quan_tri_vien", {
      _ma_nguoi_dung: context.userId,
    });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    if (data.maNguoiDung === context.userId) throw new Error("Không thể tự xóa tài khoản của chính mình");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const u = await supabaseAdmin
      .from("nguoi_dung")
      .select("MaNguoiDung, vai_tro(TenVaiTro)")
      .eq("MaNguoiDung", data.maNguoiDung)
      .maybeSingle();
    const row = u.data as unknown as { vai_tro: { TenVaiTro: string } | null } | null;
    if (!row) throw new Error("Không tìm thấy tài khoản (có thể đã được xóa)");
    if (row.vai_tro?.TenVaiTro === "QuanTriVien")
      throw new Error("Không thể xóa tài khoản Quản trị viên. Hãy đổi vai trò hoặc khóa tài khoản.");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.maNguoiDung);
    if (error) throw new Error("Xóa tài khoản thất bại: " + error.message);
    // Phòng trường hợp bản ghi nguoi_dung chưa bị xóa theo (không có cascade)
    await supabaseAdmin.from("nguoi_dung").delete().eq("MaNguoiDung", data.maNguoiDung);
    return { ok: true as const };
  });
