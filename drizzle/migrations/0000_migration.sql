create type public.app_role as enum ('student','club_rep','admin');
create type public.post_type as enum ('news','event');
create type public.post_status as enum ('pending','approved','rejected');

create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  email text not null,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique(user_id, role)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  short_intro text not null default '',
  description text not null default '',
  founded_year int,
  departments text not null default '',
  achievements text not null default '',
  contact_email text not null default '',
  contact_info text not null default '',
  logo_url text,
  cover_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.club_reps (
  user_id uuid not null,
  club_id uuid not null references public.clubs(id) on delete cascade,
  primary key (user_id, club_id)
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid,
  type public.post_type not null,
  title text not null,
  content text not null,
  image_url text,
  event_time timestamptz,
  location text,
  status public.post_status not null default 'pending',
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_club_idx on public.posts(club_id);
create index posts_status_idx on public.posts(status, type, event_time);
create table public.follows (
  user_id uuid not null,
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, club_id)
);
create table public.favorite_events (
  user_id uuid not null,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  content text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create table public.site_stats (
  id int primary key default 1,
  visits bigint not null default 0
);
insert into public.site_stats(id, visits) values (1, 0);

-- grants
grant select on public.categories, public.clubs, public.posts to anon;
grant select, insert, update, delete on public.profiles, public.user_roles, public.categories, public.clubs, public.club_reps, public.posts, public.follows, public.favorite_events, public.notifications to authenticated;
grant select on public.site_stats to authenticated;
grant all on public.profiles, public.user_roles, public.categories, public.clubs, public.club_reps, public.posts, public.follows, public.favorite_events, public.notifications, public.site_stats to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.clubs enable row level security;
alter table public.club_reps enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.favorite_events enable row level security;
alter table public.notifications enable row level security;
alter table public.site_stats enable row level security;

-- helpers
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_active_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and is_locked = false
    and lower(email) like '%@hvnh.edu.vn')
$$;
create or replace function public.is_club_rep(_user_id uuid, _club_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.club_reps where user_id = _user_id and club_id = _club_id)
    and public.has_role(_user_id, 'club_rep')
$$;

-- profiles
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    new.is_locked := old.is_locked;
    new.email := old.email;
  end if;
  if new.id = auth.uid() and old.is_locked = false then new.is_locked := false; end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile();

-- roles
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin') and user_id <> auth.uid());

-- categories
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
create policy "admin write categories" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- clubs
create policy "public read clubs" on public.clubs for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin') or public.is_club_rep(auth.uid(), id));
create policy "admin insert clubs" on public.clubs for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete clubs" on public.clubs for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin or rep update clubs" on public.clubs for update to authenticated
  using (public.has_role(auth.uid(),'admin') or (public.is_club_rep(auth.uid(), id) and public.is_active_user(auth.uid())));

create or replace function public.protect_club()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    new.is_active := old.is_active;
    new.is_featured := old.is_featured;
  end if;
  return new;
end $$;
create trigger clubs_protect before update on public.clubs for each row execute function public.protect_club();

-- club reps
create policy "read reps" on public.club_reps for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage reps" on public.club_reps for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- posts
create policy "public read approved" on public.posts for select to anon, authenticated
  using (status = 'approved' or public.has_role(auth.uid(),'admin') or public.is_club_rep(auth.uid(), club_id));
create policy "rep insert posts" on public.posts for insert to authenticated
  with check (public.is_club_rep(auth.uid(), club_id) and public.is_active_user(auth.uid()) and status = 'pending');
create policy "rep or admin update posts" on public.posts for update to authenticated
  using (public.has_role(auth.uid(),'admin') or (public.is_club_rep(auth.uid(), club_id) and public.is_active_user(auth.uid())))
  with check (public.has_role(auth.uid(),'admin') or public.is_club_rep(auth.uid(), club_id));
create policy "rep or admin delete posts" on public.posts for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.is_club_rep(auth.uid(), club_id));

create or replace function public.posts_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
  end if;
  if not public.has_role(auth.uid(),'admin') then
    new.status := 'pending';
    new.reject_reason := null;
    if tg_op = 'UPDATE' then new.club_id := old.club_id; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger posts_before_trg before insert or update on public.posts for each row execute function public.posts_before();

create or replace function public.posts_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare club_name text;
begin
  select name into club_name from public.clubs where id = new.club_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending' or old.updated_at <> new.updated_at) then
    insert into public.notifications(user_id, content, link)
      select user_id, club_name || ' vừa gửi bài "' || new.title || '" chờ duyệt', '/admin/duyet-bai'
      from public.user_roles where role = 'admin';
  elsif tg_op = 'UPDATE' and new.status = 'approved' and old.status <> 'approved' then
    insert into public.notifications(user_id, content, link)
      select user_id, 'Bài "' || new.title || '" đã được duyệt', '/clb/bai-dang'
      from public.club_reps where club_id = new.club_id;
    insert into public.notifications(user_id, content, link)
      select user_id, club_name || ' vừa đăng ' || case when new.type='event' then 'sự kiện' else 'tin' end || ' mới: ' || new.title,
        '/cau-lac-bo/' || new.club_id
      from public.follows where club_id = new.club_id;
  elsif tg_op = 'UPDATE' and new.status = 'rejected' and old.status <> 'rejected' then
    insert into public.notifications(user_id, content, link)
      select user_id, 'Bài "' || new.title || '" bị từ chối. Lý do: ' || coalesce(new.reject_reason,''), '/clb/bai-dang'
      from public.club_reps where club_id = new.club_id;
  end if;
  return new;
end $$;
create trigger posts_after_trg after insert or update on public.posts for each row execute function public.posts_after();

-- follows / favorites
create policy "own follows" on public.follows for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_club_rep(auth.uid(), club_id));
create policy "insert follows" on public.follows for insert to authenticated with check (user_id = auth.uid() and public.is_active_user(auth.uid()));
create policy "delete follows" on public.follows for delete to authenticated using (user_id = auth.uid());
create policy "own favs" on public.favorite_events for select to authenticated using (user_id = auth.uid());
create policy "insert favs" on public.favorite_events for insert to authenticated with check (user_id = auth.uid() and public.is_active_user(auth.uid()));
create policy "delete favs" on public.favorite_events for delete to authenticated using (user_id = auth.uid());

-- notifications
create policy "own notifs" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "update own notifs" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "delete own notifs" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- stats
create policy "admin read stats" on public.site_stats for select to authenticated using (public.has_role(auth.uid(),'admin'));
create or replace function public.track_visit() returns void language sql security definer set search_path = public as $$
  update public.site_stats set visits = visits + 1 where id = 1
$$;
grant execute on function public.track_visit() to anon, authenticated;

-- follower count (public)
create or replace function public.club_follower_count(_club_id uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.follows where club_id = _club_id
$$;
grant execute on function public.club_follower_count(uuid) to anon, authenticated;

-- new users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) not like '%@hvnh.edu.vn' then
    raise exception 'Chỉ chấp nhận email trường có đuôi @hvnh.edu.vn';
  end if;
  insert into public.profiles(id, email, full_name)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  insert into public.user_roles(user_id, role) values (new.id, 'student');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- seed
insert into public.categories(id, name) values
 ('11111111-0000-0000-0000-000000000001','Học thuật'),
 ('11111111-0000-0000-0000-000000000002','Kỹ năng mềm'),
 ('11111111-0000-0000-0000-000000000003','Nghệ thuật'),
 ('11111111-0000-0000-0000-000000000004','Thể thao'),
 ('11111111-0000-0000-0000-000000000005','Tình nguyện'),
 ('11111111-0000-0000-0000-000000000006','Truyền thông');

insert into public.clubs(id,name,category_id,short_intro,description,founded_year,departments,achievements,contact_email,contact_info,is_featured) values
('22222222-0000-0000-0000-000000000001','CLB Nghiên cứu khoa học sinh viên','11111111-0000-0000-0000-000000000001','Nơi ươm mầm những ý tưởng nghiên cứu về tài chính – ngân hàng.','CLB tổ chức các buổi seminar phương pháp nghiên cứu, hỗ trợ sinh viên tham gia giải thưởng Sinh viên nghiên cứu khoa học và các hội thảo học thuật.',2010,'Ban Chuyên môn, Ban Sự kiện, Ban Truyền thông, Ban Đối ngoại','Giải Nhất NCKH cấp Bộ 2024; 30+ đề tài đạt giải cấp Học viện','nckh@hvnh.edu.vn','Fanpage: facebook.com/nckh.bav',true),
('22222222-0000-0000-0000-000000000002','CLB Tiếng Anh BA English','11111111-0000-0000-0000-000000000002','Luyện tiếng Anh mỗi tuần, tự tin giao tiếp và thuyết trình.','BA English mang đến môi trường thực hành tiếng Anh qua English Talk, Debate và các cuộc thi hùng biện thường niên.',2008,'Ban Học thuật, Ban Sự kiện, Ban Nhân sự, Ban Media','Quán quân English Debate liên trường 2023','baenglish@hvnh.edu.vn','Phòng sinh hoạt: P.102 nhà D',true),
('22222222-0000-0000-0000-000000000003','CLB Guitar BAV','11111111-0000-0000-0000-000000000003','Kết nối những trái tim yêu âm nhạc qua từng phím đàn.','CLB Guitar BAV tổ chức lớp guitar cơ bản, đêm nhạc acoustic và tham gia biểu diễn tại các sự kiện của Học viện.',2012,'Ban Chuyên môn, Ban Hậu cần, Ban Truyền thông','Đêm nhạc "Thanh âm BAV" thu hút 1.000 khán giả','guitar@hvnh.edu.vn','Sinh hoạt tối thứ Tư hàng tuần',true),
('22222222-0000-0000-0000-000000000004','CLB Bóng đá Học viện','11111111-0000-0000-0000-000000000004','Rèn luyện thể lực, tinh thần đồng đội trên sân cỏ.','CLB tổ chức giải bóng đá sinh viên thường niên và tập luyện định kỳ cho đội tuyển Học viện.',2005,'Ban Huấn luyện, Ban Tổ chức giải, Ban Hậu cần','Hạng Ba giải bóng đá sinh viên Hà Nội 2024','bongda@hvnh.edu.vn','Sân bóng Học viện, chiều thứ Bảy',false),
('22222222-0000-0000-0000-000000000005','CLB Tình nguyện Mùa Xuân','11111111-0000-0000-0000-000000000005','Lan tỏa yêu thương qua những chuyến đi tình nguyện.','CLB thực hiện các chương trình Xuân tình nguyện, Mùa hè xanh, quyên góp sách vở và áo ấm cho trẻ em vùng cao.',2011,'Ban Dự án, Ban Gây quỹ, Ban Truyền thông, Ban Hậu cần','Bằng khen Thành đoàn Hà Nội 2023','muaxuan@hvnh.edu.vn','Hotline: 0900 000 000',true),
('22222222-0000-0000-0000-000000000006','CLB Truyền thông BA Media','11111111-0000-0000-0000-000000000006','Sáng tạo nội dung, chụp ảnh, quay dựng cho các hoạt động của Học viện.','BA Media là đội ngũ truyền thông sinh viên, phụ trách ghi hình, thiết kế và sản xuất nội dung cho sự kiện.',2014,'Ban Thiết kế, Ban Nhiếp ảnh, Ban Video, Ban Nội dung','Giải Ba cuộc thi phim ngắn sinh viên 2024','bamedia@hvnh.edu.vn','Fanpage: facebook.com/bamedia',true);

insert into public.posts(club_id,type,title,content,event_time,location,status,reject_reason,created_at) values
('22222222-0000-0000-0000-000000000001','event','Seminar: Phương pháp nghiên cứu định lượng','Hướng dẫn sử dụng Stata và SPSS cho đề tài NCKH sinh viên.', now() + interval '5 days','Hội trường A, Học viện Ngân hàng','approved',null, now() - interval '3 days'),
('22222222-0000-0000-0000-000000000002','event','English Talk: Future of Fintech','Buổi talkshow bằng tiếng Anh cùng khách mời từ các ngân hàng.', now() + interval '9 days','Phòng 305 nhà D','approved',null, now() - interval '2 days'),
('22222222-0000-0000-0000-000000000003','event','Đêm nhạc Acoustic "Thu về"','Đêm nhạc acoustic mở cửa tự do cho toàn thể sinh viên.', now() + interval '14 days','Sân khấu ngoài trời','approved',null, now() - interval '1 days'),
('22222222-0000-0000-0000-000000000004','event','Khai mạc giải bóng đá BAV Cup','Lễ khai mạc và trận đấu mở màn giữa các khoa.', now() + interval '20 days','Sân bóng Học viện','approved',null, now() - interval '1 days'),
('22222222-0000-0000-0000-000000000005','event','Chiến dịch Áo ấm vùng cao','Tiếp nhận quyên góp áo ấm tại sảnh nhà A.', now() + interval '3 days','Sảnh nhà A','approved',null, now() - interval '4 days'),
('22222222-0000-0000-0000-000000000006','news','BA Media tuyển thành viên Gen 11','BA Media chính thức mở đơn tuyển thành viên các ban Thiết kế, Nhiếp ảnh, Video.', null,null,'approved',null, now() - interval '5 days'),
('22222222-0000-0000-0000-000000000001','news','Kết quả vòng sơ loại NCKH 2026','Danh sách 25 đề tài lọt vào vòng chung kết.', null,null,'approved',null, now() - interval '6 days'),
('22222222-0000-0000-0000-000000000002','event','Cuộc thi hùng biện BA Speak Up','Vòng đăng ký cuộc thi hùng biện tiếng Anh.', now() + interval '25 days','Hội trường B','pending',null, now() - interval '1 hours'),
('22222222-0000-0000-0000-000000000003','news','Mở lớp guitar cơ bản khóa 15','Đăng ký học guitar miễn phí cho tân sinh viên.', null,null,'pending',null, now() - interval '2 hours'),
('22222222-0000-0000-0000-000000000004','news','Tuyển cầu thủ đội tuyển','Thông báo tuyển cầu thủ.', null,null,'rejected','Nội dung còn sơ sài, vui lòng bổ sung thời gian và cách thức đăng ký.', now() - interval '2 days');
