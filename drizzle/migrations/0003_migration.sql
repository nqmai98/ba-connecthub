-- Tài khoản Đại diện CLB đăng nhập bằng username (không có email trường).
-- Thêm cột username vào profiles để Quản trị viên tra cứu và để chặn trùng tên đăng nhập.
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key on public.profiles (lower(username)) where username is not null;
