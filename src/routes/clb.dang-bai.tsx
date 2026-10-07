import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Empty, Page, RoleGate } from "@/components/common";
import { PostForm } from "@/components/forms";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/clb/dang-bai")({
  head: () => ({
    meta: [
      { title: "Đăng bài – BA CLUBS" },
      {
        name: "description",
        content:
          "Đăng tin tức, chương trình, thành tích, thông báo hoặc sự kiện mới cho câu lạc bộ.",
      },
      { property: "og:title", content: "Đăng bài – BA CLUBS" },
      { property: "og:description", content: "Đăng tin tức hoặc sự kiện mới cho câu lạc bộ." },
    ],
  }),
  component: () => (
    <RoleGate vaiTro={["DaiDienCLB"]}>
      <NewPost />
    </RoleGate>
  ),
});

function NewPost() {
  const { maCLB } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  return (
    <Page title="Đăng bài" subtitle="Bài đăng sẽ được Quản trị viên duyệt trước khi công khai">
      {!maCLB ? (
        <Empty text="Tài khoản chưa được gán CLB nào" />
      ) : (
        <Card className="max-w-3xl">
          <PostForm
            maCLB={maCLB}
            onCancel={() => nav({ to: "/clb" })}
            onDone={() => {
              qc.invalidateQueries({ queryKey: ["bai_dang_cua_toi"] });
              nav({ to: "/clb/bai-dang" });
            }}
          />
        </Card>
      )}
    </Page>
  );
}
