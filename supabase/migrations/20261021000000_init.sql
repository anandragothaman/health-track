-- =====================================================================
-- Family Health Track — Supabase schema, RLS policies and functions
-- Run this whole file once in Supabase Dashboard → SQL Editor → New query.
-- It is safe to re-run (objects are created with IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- ---------- Tables ----------------------------------------------------

create table if not exists public.families (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 80),
  invite_code  text unique,
  created_at   timestamptz not null default now()
);

create table if not exists public.family_access (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  auth_user_id  uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'member')),
  email         text,
  created_at    timestamptz not null default now(),
  unique (family_id, auth_user_id)
);

create table if not exists public.family_members (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  full_name      text not null check (char_length(full_name) between 1 and 80),
  date_of_birth  date check (date_of_birth is null or date_of_birth between '1900-01-01' and current_date),
  gender         text check (gender is null or gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  avatar_color   text not null default 'teal' check (char_length(avatar_color) <= 20),
  -- Per-person display unit, target ranges and reminder times (validated in the app).
  settings       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create table if not exists public.blood_pressure_readings (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.family_members(id) on delete cascade,
  systolic     smallint not null check (systolic between 50 and 300),
  diastolic    smallint not null check (diastolic between 30 and 200),
  heart_rate   smallint check (heart_rate is null or heart_rate between 20 and 250),
  session      text not null check (session in ('morning', 'afternoon', 'evening', 'other')),
  measured_at  timestamptz not null,
  notes        text check (notes is null or char_length(notes) <= 500),
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint bp_systolic_gt_diastolic check (systolic > diastolic)
);

create table if not exists public.blood_glucose_readings (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.family_members(id) on delete cascade,
  glucose_value  numeric(6, 1) not null,
  unit           text not null check (unit in ('mg/dL', 'mmol/L')),
  reading_type   text not null check (reading_type in (
                   'fasting', 'before_breakfast', 'after_breakfast', 'before_lunch',
                   'after_lunch', 'before_dinner', 'after_dinner', 'bedtime', 'random')),
  measured_at    timestamptz not null,
  notes          text check (notes is null or char_length(notes) <= 500),
  created_by     uuid default auth.uid() references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint glucose_value_range check (
    (unit = 'mg/dL'  and glucose_value between 10 and 1000) or
    (unit = 'mmol/L' and glucose_value between 0.5 and 55.5))
);

-- ---------- Indexes ---------------------------------------------------

create index if not exists family_access_user_idx   on public.family_access (auth_user_id);
create index if not exists family_members_family_idx on public.family_members (family_id);
create index if not exists bp_member_time_idx        on public.blood_pressure_readings (member_id, measured_at desc);
create index if not exists glucose_member_time_idx   on public.blood_glucose_readings (member_id, measured_at desc);

-- ---------- Access helper functions ----------------------------------
-- SECURITY DEFINER so policies can check family_access without recursive RLS.

create or replace function public.is_family_member(p_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_access
    where family_id = p_family_id and auth_user_id = (select auth.uid())
  );
$$;

create or replace function public.is_family_owner(p_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_access
    where family_id = p_family_id and auth_user_id = (select auth.uid()) and role = 'owner'
  );
$$;

create or replace function public.can_access_member(p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.family_members m
    join public.family_access a on a.family_id = m.family_id
    where m.id = p_member_id and a.auth_user_id = (select auth.uid())
  );
$$;

-- ---------- Row Level Security ---------------------------------------

alter table public.families                enable row level security;
alter table public.family_access           enable row level security;
alter table public.family_members          enable row level security;
alter table public.blood_pressure_readings enable row level security;
alter table public.blood_glucose_readings  enable row level security;

-- Defence in depth: anonymous visitors get no table privileges at all.
revoke all on public.families, public.family_access, public.family_members,
              public.blood_pressure_readings, public.blood_glucose_readings from anon;

-- families: members can read; only owners can rename. Creation goes through create_family().
drop policy if exists families_select on public.families;
create policy families_select on public.families for select to authenticated
  using (public.is_family_member(id));

drop policy if exists families_update on public.families;
create policy families_update on public.families for update to authenticated
  using (public.is_family_owner(id)) with check (public.is_family_owner(id));

-- family_access: members can see who has access; owners can remove members; anyone can leave.
-- Inserts only happen through create_family() / join_family().
drop policy if exists family_access_select on public.family_access;
create policy family_access_select on public.family_access for select to authenticated
  using (public.is_family_member(family_id));

drop policy if exists family_access_delete on public.family_access;
create policy family_access_delete on public.family_access for delete to authenticated
  using (
    (auth_user_id = (select auth.uid()) and role <> 'owner')
    or (public.is_family_owner(family_id) and role <> 'owner')
  );

-- family_members: full CRUD for anyone with access to the family.
drop policy if exists family_members_all on public.family_members;
create policy family_members_all on public.family_members for all to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- readings: full CRUD for anyone with access to the member's family.
drop policy if exists bp_all on public.blood_pressure_readings;
create policy bp_all on public.blood_pressure_readings for all to authenticated
  using (public.can_access_member(member_id))
  with check (public.can_access_member(member_id));

drop policy if exists glucose_all on public.blood_glucose_readings;
create policy glucose_all on public.blood_glucose_readings for all to authenticated
  using (public.can_access_member(member_id))
  with check (public.can_access_member(member_id));

-- ---------- Family onboarding RPCs -----------------------------------

create or replace function public.new_invite_code()
returns text language sql volatile as $$
  -- 12 hex characters (48 bits) — impractical to guess.
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
$$;

create or replace function public.create_family(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_family uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'Family name is required'; end if;
  if exists (select 1 from family_access where auth_user_id = v_uid) then
    raise exception 'You already belong to a family';
  end if;

  insert into families (name, invite_code) values (trim(p_name), new_invite_code())
  returning id into v_family;

  insert into family_access (family_id, auth_user_id, role, email)
  values (v_family, v_uid, 'owner', auth.jwt() ->> 'email');

  return v_family;
end;
$$;

create or replace function public.join_family(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_family uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select id into v_family from families
  where invite_code is not null
    and invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_family is null then raise exception 'Invite code not recognised'; end if;

  insert into family_access (family_id, auth_user_id, role, email)
  values (v_family, v_uid, 'member', auth.jwt() ->> 'email')
  on conflict (family_id, auth_user_id) do nothing;

  return v_family;
end;
$$;

create or replace function public.set_invite_code(p_family_id uuid, p_enabled boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text := case when p_enabled then new_invite_code() else null end;
begin
  if not is_family_owner(p_family_id) then raise exception 'Only the family owner can change the invite code'; end if;
  update families set invite_code = v_code where id = p_family_id;
  return v_code;
end;
$$;

-- ---------- Family overview (one round trip for the overview page) ----
-- SECURITY INVOKER: RLS on the underlying tables still applies.

create or replace function public.get_family_overview(
  p_family_id uuid, p_day_start timestamptz, p_day_end timestamptz)
returns table (
  member_id            uuid,
  bp_systolic          smallint,
  bp_diastolic         smallint,
  bp_heart_rate        smallint,
  bp_measured_at       timestamptz,
  glucose_value        numeric,
  glucose_unit         text,
  glucose_reading_type text,
  glucose_measured_at  timestamptz,
  sessions_today       int
)
language sql stable security invoker set search_path = public as $$
  select
    m.id,
    bp.systolic, bp.diastolic, bp.heart_rate, bp.measured_at,
    g.glucose_value, g.unit, g.reading_type, g.measured_at,
    (select count(distinct b.session)::int
       from blood_pressure_readings b
      where b.member_id = m.id
        and b.session in ('morning', 'afternoon', 'evening')
        and b.measured_at >= p_day_start and b.measured_at < p_day_end)
  from family_members m
  left join lateral (
    select systolic, diastolic, heart_rate, measured_at
    from blood_pressure_readings where member_id = m.id
    order by measured_at desc limit 1) bp on true
  left join lateral (
    select glucose_value, unit, reading_type, measured_at
    from blood_glucose_readings where member_id = m.id
    order by measured_at desc limit 1) g on true
  where m.family_id = p_family_id;
$$;

-- ---------- Function privileges --------------------------------------

revoke execute on function public.create_family(text)                from public, anon;
revoke execute on function public.join_family(text)                  from public, anon;
revoke execute on function public.set_invite_code(uuid, boolean)     from public, anon;
revoke execute on function public.get_family_overview(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.new_invite_code()                  from public, anon, authenticated;

grant execute on function public.create_family(text)                to authenticated;
grant execute on function public.join_family(text)                  to authenticated;
grant execute on function public.set_invite_code(uuid, boolean)     to authenticated;
grant execute on function public.get_family_overview(uuid, timestamptz, timestamptz) to authenticated;
