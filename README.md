# BA ConnectHub

Hãy xây dựng website "BA CLUBS" – nền tảng giới thiệu và tra cứu thông tin các câu lạc bộ, liên chi đoàn, liên chi hội, đội nhóm tại Học viện Ngân hàng (BAV). Toàn bộ giao diện bằng tiếng Việt.

## 1. Công nghệ
React + TypeScript + Tailwind CSS + shadcn/ui, dùng Supabase cho Auth, Database, Storage và phân quyền (RLS). Responsive tốt trên điện thoại, máy tính bảng, máy tính (phần lớn sinh viên dùng điện thoại).

## 2. Phong cách thiết kế
- Dùng logo đính kèm ở header, trang đăng nhập và hero trang chủ.
- Màu chủ đạo lấy theo logo: xanh navy #292B75 (màu chính), vàng cam #F9A61A (màu nhấn, nút hành động), nền sáng #F6F7FC, thẻ trắng, viền #DADCEF, chữ xanh đen đậm #14163F.
- Giao diện sáng, dễ nhìn, chữ đậm rõ (font-weight 600–800), font "Be Vietnam Pro", bo góc 12–16px, bóng đổ nhẹ.
- Thanh chức năng (navigation bar) đặt NGANG ở đầu trang, cố định khi cuộn. Bên trái là logo và tên "BA CLUBS – Học viện Ngân hàng", ở giữa là các mục menu theo vai trò, bên phải là thông tin người dùng, vai trò và nút Đăng xuất. Mục đang chọn tô nền navy chữ trắng. Trên mobile menu cuộn ngang được.
- Trạng thái bài đăng dùng huy hiệu màu: Chờ duyệt (vàng), Đã duyệt (xanh lá), Bị từ chối (đỏ).

## 3. Đăng nhập (chỉ dùng email trường)
- Chỉ cho phép đăng nhập/đăng ký bằng email có đuôi @hvnh.edu.vn. Kiểm tra ở cả phía client (hiện lỗi "Chỉ chấp nhận email trường có đuôi @hvnh.edu.vn") và phía server (Supabase trigger/RLS chặn mọi email khác).
- Trang đăng nhập có logo, ô email, ô mật khẩu, nút Đăng nhập; sau khi đăng nhập tự chuyển đến trang chủ đúng vai trò.
- Có 3 vai trò lưu trong bảng riêng user_roles: student (Sinh viên), club_rep (Đại diện CLB), admin (Quản trị viên). Tài khoản mới mặc định là student; admin được nâng quyền cho tài khoản khác. Mỗi vai trò chỉ thao tác trong phạm vi quyền của mình (kiểm tra bằng RLS, không chỉ ẩn nút ở giao diện).

## 4. Giao diện Sinh viên
Menu: Trang chủ | Câu lạc bộ | Sự kiện | Lịch cá nhân | Đang theo dõi | Thông báo
- Khách chưa đăng nhập vẫn tra cứu được CLB và sự kiện. Khi bấm "Theo dõi" hoặc "Yêu thích" mà chưa đăng nhập thì hiện hộp thoại yêu cầu đăng nhập.
- Trang chủ: banner chào mừng với nút "Tìm câu lạc bộ", các nút lọc nhanh theo lĩnh vực, CLB nổi bật, sự kiện sắp diễn ra.
- Danh sách CLB: thanh tìm kiếm theo tên/từ khóa, bộ lọc theo lĩnh vực (Học thuật, Kỹ năng mềm, Nghệ thuật, Thể thao, Tình nguyện, Truyền thông). Mỗi CLB là một thẻ gồm logo, tên, lĩnh vực, giới thiệu ngắn, nút "Xem chi tiết" và "Theo dõi". Không có kết quả thì hiện "Không tìm thấy câu lạc bộ phù hợp".
- Chi tiết CLB: tên, logo, giới thiệu, lĩnh vực, năm thành lập, ban chuyên môn, thành tích nổi bật, thông tin liên hệ, tin tức và sự kiện của CLB, nút Theo dõi / Đang theo dõi (bỏ theo dõi có hộp xác nhận "Bạn có chắc chắn muốn bỏ theo dõi câu lạc bộ này?").
- Sự kiện: danh sách sự kiện (tên, thời gian, địa điểm, CLB tổ chức), nút ☆ Yêu thích. Bấm yêu thích thì tự lưu vào Lịch cá nhân và hiện thông báo "Đã lưu sự kiện vào lịch cá nhân"; bỏ yêu thích có xác nhận và xóa khỏi lịch.
- Lịch cá nhân: hiển thị các sự kiện đã yêu thích (dạng lịch tháng và dạng danh sách).
- Thông báo: nhận thông báo khi CLB đang theo dõi đăng tin hoặc sự kiện mới.

## 5. Giao diện Đại diện CLB
Menu: Tổng quan | Đăng bài | Bài đăng của tôi | Thông tin CLB | Thông báo
- Tổng quan: số người theo dõi, số bài đã gửi, số bài chờ duyệt, số sự kiện sắp tới, nút thao tác nhanh.
- Đăng bài (tin tức/sự kiện): loại bài, tiêu đề, nội dung, hình ảnh (upload lên Supabase Storage), thời gian, địa điểm (nếu là sự kiện). Nút "Gửi duyệt": kiểm tra thiếu trường thì đánh dấu đỏ và báo lỗi; hợp lệ thì lưu trạng thái "Chờ duyệt", gửi thông báo cho Quản trị viên và hiện "Gửi bài thành công, bài đăng đang chờ duyệt". Nút "Hủy" có hộp xác nhận.
- Bài đăng của tôi: bảng bài đã gửi kèm trạng thái (Chờ duyệt / Đã duyệt / Bị từ chối), hiển thị lý do khi bị từ chối, cho phép chỉnh sửa và gửi lại.
- Thông tin CLB: chỉnh sửa tên, lĩnh vực, giới thiệu, ban chuyên môn, thành tích, liên hệ, logo, ảnh minh họa của đúng CLB mình phụ trách (không sửa được CLB khác).

## 6. Giao diện Quản trị viên
Menu: Dashboard | Duyệt bài | Quản lý CLB | Quản lý tài khoản
- Dashboard: thẻ thống kê (số CLB, số bài viết, số sự kiện, số bài chờ duyệt, lượt truy cập), biểu đồ cột số bài đăng theo CLB (dùng recharts, màu navy và vàng cam).
- Duyệt bài: danh sách bài chờ duyệt, xem chi tiết nội dung và CLB gửi. "Duyệt" hiện hộp xác nhận, sau đó chuyển trạng thái "Đã duyệt", công khai bài và gửi thông báo cho Đại diện CLB. "Từ chối" bắt buộc nhập lý do, chuyển trạng thái "Bị từ chối" và gửi thông báo kèm lý do. Chọn "Hủy" thì giữ nguyên trạng thái.
- Quản lý CLB: thêm, sửa, ẩn/xóa CLB, quản lý danh mục lĩnh vực, gán tài khoản Đại diện CLB cho từng CLB.
- Quản lý tài khoản: danh sách tài khoản (họ tên, email, vai trò), đổi vai trò, khóa/mở khóa tài khoản.

## 7. Cơ sở dữ liệu Supabase (gợi ý)
profiles(id, full_name, email, is_locked) · user_roles(user_id, role) · categories(id, name) · clubs(id, name, category_id, description, founded_year, departments, achievements, contact_email, logo_url, is_active) · club_reps(user_id, club_id) · posts(id, club_id, type [news|event], title, content, image_url, event_time, location, status [pending|approved|rejected], reject_reason, created_at) · follows(user_id, club_id) · favorite_events(user_id, post_id) · notifications(id, user_id, content, is_read, created_at).
Chỉ bài có status = approved mới hiển thị công khai. Bật RLS cho mọi bảng.

## 8. Yêu cầu khác
- Tạo sẵn dữ liệu mẫu: 6 CLB (CLB Nghiên cứu khoa học sinh viên, CLB Tiếng Anh BA English, CLB Guitar BAV, CLB Bóng đá Học viện, CLB Tình nguyện Mùa Xuân, CLB Truyền thông BA Media), vài sự kiện và bài đăng với đủ 3 trạng thái.
- Hiển thị toast thông báo cho mọi thao tác thành công/thất bại.
- Có skeleton loading, trạng thái rỗng thân thiện, và tối ưu tốc độ khi nhiều người truy cập cùng lúc.
- Phạm vi hiện tại KHÔNG làm: gợi ý CLB bằng AI, chatbot, ứng dụng di động riêng.

Hãy bắt đầu bằng khung giao diện (navigation, đăng nhập, 3 bộ menu theo vai trò) và dữ liệu mẫu, sau đó nối Supabase cho từng chức năng.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7fecb683-1f65-4943-93f5-64c8ea77c26b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
