import { createFileRoute } from "@tanstack/react-router";
import { StudentLogin } from "@/components/student/StudentLogin";

export const Route = createFileRoute("/dang-nhap")({
  head: () => ({
    meta: [
      { title: "Đăng nhập – BAV CLUBS" },
      { name: "description", content: "Sinh viên đăng nhập BAV CLUBS bằng email trường @hvnh.edu.vn." },
      { property: "og:title", content: "Đăng nhập – BAV CLUBS" },
      { property: "og:description", content: "Sinh viên đăng nhập BAV CLUBS bằng email trường @hvnh.edu.vn." },
    ],
  }),
  // Google OAuth của sinh viên cũng quay về trang này; StudentLogin đã xử lý sẵn
  component: StudentLogin,
});
