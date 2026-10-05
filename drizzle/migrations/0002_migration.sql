create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare by_admin boolean := coalesce((new.raw_app_meta_data->>'created_by_admin')::boolean, false);
declare cid uuid := nullif(new.raw_app_meta_data->>'club_id','')::uuid;
begin
  if not by_admin and (new.email is null or lower(new.email) not like '%@hvnh.edu.vn') then
    raise exception 'Chỉ chấp nhận email trường có đuôi @hvnh.edu.vn';
  end if;
  insert into public.profiles(id, email, full_name)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
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

create or replace function public.is_active_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and is_locked = false
    and (lower(email) like '%@hvnh.edu.vn' or public.has_role(_user_id,'club_rep') or public.has_role(_user_id,'admin')))
$$;