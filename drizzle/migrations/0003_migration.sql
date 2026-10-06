-- Tài khoản CLB đăng nhập bằng username thay vì email
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key
  on public.profiles (lower(username)) where username is not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare by_admin boolean := coalesce((new.raw_app_meta_data->>'created_by_admin')::boolean, false);
declare cid uuid := nullif(new.raw_app_meta_data->>'club_id','')::uuid;
begin
  if not by_admin and (new.email is null or lower(new.email) not like '%@hvnh.edu.vn') then
    raise exception 'Chỉ chấp nhận email trường có đuôi @hvnh.edu.vn';
  end if;
  insert into public.profiles(id, email, full_name, username)
    values (
      new.id,
      lower(new.email),
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
      case when by_admin then nullif(lower(new.raw_user_meta_data->>'username'), '') else null end
    );
  if by_admin and cid is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'club_rep');
    insert into public.club_reps(user_id, club_id) values (new.id, cid);
  else
    insert into public.user_roles(user_id, role) values (new.id, 'student');
    if not exists (select 1 from public.user_roles where role = 'admin') then
      insert into public.user_roles(user_id, role) values (new.id, 'admin');
    end if;
  end if;
  return new;
end $$;

-- Chỉ admin được đổi username / email / trạng thái khóa
create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    new.is_locked := old.is_locked;
    new.email := old.email;
    new.username := old.username;
  end if;
  if new.id = auth.uid() and old.is_locked = false then new.is_locked := false; end if;
  return new;
end $$;
