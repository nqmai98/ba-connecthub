import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { homePath, isSchoolEmail, useAuth } from "@/lib/auth";

export const DOMAIN_ERR = "Chỉ chấp nhận email trường có đuôi @hvnh.edu.vn";

/**
 * Xử lý sau khi sinh viên đăng nhập Google (Google quay về /dang-nhap):
 * báo lỗi nếu bị từ chối, chặn email ngoài trường, chặn tài khoản bị khóa
 * (TrangThaiTaiKhoan = 'BiKhoa'), rồi chuyển về trang chủ đúng vai trò.
 */
export function useStudentLoginRedirect() {
  const navigate = useNavigate();
  const { ready, maNguoiDung, vaiTro, biKhoa, signOut, session } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search + "&" + window.location.hash.slice(1),
    );
    if (params.get("error_description") || params.get("error")) {
      toast.error(DOMAIN_ERR + ". Tài khoản Google bạn chọn không được phép truy cập.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!ready || !maNguoiDung) return;
    const mail = session?.user.email ?? "";
    if (!isSchoolEmail(mail) && vaiTro === "SinhVien") {
      toast.error(DOMAIN_ERR + ". Tài khoản " + (mail || "này") + " không thể đăng nhập.");
      signOut();
      return;
    }
    if (biKhoa) {
      toast.error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.");
      signOut();
      return;
    }
    navigate({ to: homePath(vaiTro), replace: true });
  }, [ready, maNguoiDung, vaiTro, biKhoa]);
}
