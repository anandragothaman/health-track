-- =====================================================================
-- Example seed data — three fictional family members with ~45 days of readings.
--
-- 1. Run schema.sql first.
-- 2. Sign up once in the app (or create a user under Authentication → Users).
-- 3. Put that user's email below and run this file in the SQL Editor.
--    If the user already owns a family, the sample members are added to it.
--    Otherwise a new "Sample Family" is created with that user as owner.
--
-- All names and readings are fictional. Delete them any time from Profiles.
-- =====================================================================

do $$
declare
  v_email   text := 'you@example.com';   -- <-- CHANGE THIS
  v_user    uuid;
  v_family  uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid;
  d int;
  v_day timestamptz;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No auth user with email %. Sign up in the app first.', v_email;
  end if;

  select family_id into v_family from public.family_access where auth_user_id = v_user limit 1;
  if v_family is null then
    insert into public.families (name, invite_code) values ('Sample Family', public.new_invite_code())
    returning id into v_family;
    insert into public.family_access (family_id, auth_user_id, role, email)
    values (v_family, v_user, 'owner', v_email);
  end if;

  insert into public.family_members (family_id, full_name, date_of_birth, gender, avatar_color, settings)
  values (v_family, 'Ravi Kumar (sample)', '1958-04-12', 'male', 'blue',
          '{"glucoseUnit":"mg/dL","glucosePreset":"ada"}')
  returning id into v_m1;

  insert into public.family_members (family_id, full_name, date_of_birth, gender, avatar_color, settings)
  values (v_family, 'Meena Kumar (sample)', '1962-09-30', 'female', 'teal',
          '{"glucoseUnit":"mg/dL","glucosePreset":"nondiabetic"}')
  returning id into v_m2;

  insert into public.family_members (family_id, full_name, date_of_birth, gender, avatar_color, settings)
  values (v_family, 'Arjun Kumar (sample)', '1990-01-15', 'male', 'violet',
          '{"glucoseUnit":"mmol/L","glucosePreset":"nondiabetic"}')
  returning id into v_m3;

  for d in 0..44 loop
    v_day := date_trunc('day', now()) - make_interval(days => d);

    -- Ravi: mildly raised BP, three sessions (some days missed), glucose ~ diabetic range.
    if d % 9 <> 4 then
      insert into public.blood_pressure_readings (member_id, systolic, diastolic, heart_rate, session, measured_at, created_by)
      values (v_m1, 132 + (random()*14)::int, 82 + (random()*8)::int, 68 + (random()*10)::int, 'morning',
              v_day + interval '7 hours 45 minutes' + make_interval(mins => (random()*40)::int), v_user);
    end if;
    if d % 5 <> 2 then
      insert into public.blood_pressure_readings (member_id, systolic, diastolic, heart_rate, session, measured_at, created_by)
      values (v_m1, 126 + (random()*12)::int, 79 + (random()*8)::int, 72 + (random()*10)::int, 'afternoon',
              v_day + interval '14 hours' + make_interval(mins => (random()*50)::int), v_user);
    end if;
    insert into public.blood_pressure_readings (member_id, systolic, diastolic, heart_rate, session, measured_at, created_by)
    values (v_m1, 128 + (random()*14)::int, 80 + (random()*9)::int, 66 + (random()*8)::int, 'evening',
            v_day + interval '20 hours' + make_interval(mins => (random()*45)::int), v_user);

    insert into public.blood_glucose_readings (member_id, glucose_value, unit, reading_type, measured_at, created_by)
    values (v_m1, 110 + (random()*35)::int, 'mg/dL', 'fasting', v_day + interval '7 hours 15 minutes', v_user),
           (v_m1, 145 + (random()*55)::int, 'mg/dL', 'after_lunch', v_day + interval '14 hours 30 minutes', v_user),
           (v_m1, 120 + (random()*40)::int, 'mg/dL', 'bedtime', v_day + interval '22 hours', v_user);

    -- Meena: BP mostly normal, glucose occasionally.
    insert into public.blood_pressure_readings (member_id, systolic, diastolic, heart_rate, session, measured_at, created_by)
    values (v_m2, 112 + (random()*12)::int, 70 + (random()*8)::int, 70 + (random()*8)::int, 'morning',
            v_day + interval '8 hours' + make_interval(mins => (random()*30)::int), v_user),
           (v_m2, 114 + (random()*10)::int, 72 + (random()*6)::int, 74 + (random()*8)::int, 'evening',
            v_day + interval '19 hours 30 minutes' + make_interval(mins => (random()*30)::int), v_user);
    if d % 3 = 0 then
      insert into public.blood_glucose_readings (member_id, glucose_value, unit, reading_type, measured_at, created_by)
      values (v_m2, 84 + (random()*14)::int, 'mg/dL', 'fasting', v_day + interval '7 hours 30 minutes', v_user);
    end if;

    -- Arjun: occasional readings in mmol/L.
    if d % 4 = 0 then
      insert into public.blood_pressure_readings (member_id, systolic, diastolic, heart_rate, session, measured_at, created_by)
      values (v_m3, 118 + (random()*10)::int, 74 + (random()*8)::int, 62 + (random()*10)::int, 'morning',
              v_day + interval '9 hours', v_user);
      insert into public.blood_glucose_readings (member_id, glucose_value, unit, reading_type, measured_at, created_by)
      values (v_m3, round((4.6 + random()*1.0)::numeric, 1), 'mmol/L', 'before_breakfast', v_day + interval '8 hours 30 minutes', v_user),
             (v_m3, round((5.5 + random()*1.8)::numeric, 1), 'mmol/L', 'after_dinner', v_day + interval '21 hours', v_user);
    end if;
  end loop;

  -- Remove any sample readings that landed in the future (later today).
  delete from public.blood_pressure_readings where member_id in (v_m1, v_m2, v_m3) and measured_at > now();
  delete from public.blood_glucose_readings  where member_id in (v_m1, v_m2, v_m3) and measured_at > now();
end $$;
