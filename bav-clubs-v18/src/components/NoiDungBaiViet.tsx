import { useMemo } from "react";
import { laHtml, lamSachHtml } from "@/lib/noi-dung";
import { cn } from "@/lib/utils";

/**
 * Hiển thị nội dung bài đăng như một trang tin: HTML đã lọc an toàn (bài soạn bằng trình soạn thảo)
 * hoặc văn bản thuần giữ nguyên xuống dòng (bài cũ).
 */
export function NoiDungBaiViet({ noiDung, className }: { noiDung: string; className?: string }) {
  const html = useMemo(() => (laHtml(noiDung) ? lamSachHtml(noiDung) : null), [noiDung]);
  if (html === null)
    return <div className={cn("noi-dung-bai whitespace-pre-line", className)}>{noiDung}</div>;
  return <div className={cn("noi-dung-bai", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
