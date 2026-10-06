-- Sửa lỗi "Chỉ chấp nhận email trường..." khi admin tạo tài khoản CLB.
-- Trigger không còn dựa vào cờ created_by_admin (lúc trigger chạy cờ này chưa có).
-- Cho phép thêm email nội bộ của tài khoản CLB (khớp CLUB_EMAIL_DOMAIN trong src/lib/club-account.ts).
-- Vai trò club_rep, bảng club_reps và username do server function gán sau khi tạo user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null
     or (lower(new.email) not like '%@hvnh.edu.vn' and lower(new.email) not like '%@clb.baclubs.local') then
    raise exception 'Chỉ chấp nhận email trường có đuôi @hvnh.edu.vn';
  end if;
  insert into public.profiles(id, email, full_name)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  insert into public.user_roles(user_id, role) values (new.id, 'student');
  if lower(new.email) like '%@hvnh.edu.vn'
     and not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;

-- Cho phép backend (service role, không có auth.uid()) cập nhật username/full_name
create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.is_locked := old.is_locked;
    new.email := old.email;
    new.username := old.username;
  end if;
  if new.id = auth.uid() and old.is_locked = false then new.is_locked := false; end if;
  return new;
end $$;
