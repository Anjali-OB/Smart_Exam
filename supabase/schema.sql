-- ═══════════════════════════════════════════════════════════════
--  SmartExam v2 — Full Schema
--  Run in: Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  email       text not null,
  role        text not null check (role in ('admin','teacher','student')),
  roll_no     text,
  avatar_url  text,
  phone       text,
  created_at  timestamptz default now()
);

-- ── Batches / Classes ─────────────────────────────────────────
create table if not exists batches (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null,
  teacher_id  uuid references profiles(id) on delete cascade,
  join_code   text unique not null,
  description text,
  created_at  timestamptz default now()
);

create table if not exists batch_members (
  batch_id    uuid references batches(id) on delete cascade,
  student_id  uuid references profiles(id) on delete cascade,
  joined_at   timestamptz default now(),
  primary key (batch_id, student_id)
);

-- ── Question Bank ─────────────────────────────────────────────
create table if not exists question_bank (
  id            uuid default uuid_generate_v4() primary key,
  teacher_id    uuid references profiles(id) on delete cascade,
  subject       text,
  topic         text,
  type          text not null check (type in ('mcq','truefalse','short','long','fillblank','match','image','code')),
  question_text text not null,
  image_url     text,
  marks         decimal default 1,
  difficulty    text default 'medium' check (difficulty in ('easy','medium','hard')),
  explanation   text,
  tags          text[],
  options       jsonb,
  created_at    timestamptz default now()
);

-- ── Tests ─────────────────────────────────────────────────────
create table if not exists tests (
  id                   uuid default uuid_generate_v4() primary key,
  teacher_id           uuid references profiles(id) on delete cascade not null,
  batch_id             uuid references batches(id),
  title                text not null,
  subject              text,
  description          text,
  instructions         text,
  duration             integer not null default 30,
  total_marks          integer not null default 0,
  passing_marks        integer default 0,
  negative_marking     decimal default 0,
  randomise_questions  boolean default false,
  randomise_options    boolean default false,
  allow_resume         boolean default false,
  show_result_after    boolean default true,
  is_published         boolean default false,
  join_code            text unique,
  start_time           timestamptz,
  end_time             timestamptz,
  created_at           timestamptz default now()
);

-- ── Sections ──────────────────────────────────────────────────
create table if not exists sections (
  id          uuid default uuid_generate_v4() primary key,
  test_id     uuid references tests(id) on delete cascade,
  title       text not null,
  description text,
  order_num   integer default 0
);

-- ── Questions ─────────────────────────────────────────────────
create table if not exists questions (
  id            uuid default uuid_generate_v4() primary key,
  test_id       uuid references tests(id) on delete cascade not null,
  section_id    uuid references sections(id),
  type          text not null check (type in ('mcq','truefalse','short','long','fillblank','match','image','code')),
  question_text text not null,
  image_url     text,
  code_snippet  text,
  code_language text default 'python',
  marks         decimal not null default 1,
  order_num     integer default 0,
  explanation   text,
  difficulty    text default 'medium',
  is_mandatory  boolean default true,
  match_pairs   jsonb,
  created_at    timestamptz default now()
);

-- ── Options ───────────────────────────────────────────────────
create table if not exists options (
  id          uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  option_text text not null,
  is_correct  boolean default false,
  order_num   integer default 0
);

-- ── Submissions ───────────────────────────────────────────────
create table if not exists submissions (
  id              uuid default uuid_generate_v4() primary key,
  test_id         uuid references tests(id) on delete cascade not null,
  student_id      uuid references profiles(id) on delete cascade not null,
  status          text default 'in_progress' check (status in ('in_progress','submitted')),
  score           decimal default 0,
  total_marks     integer default 0,
  percentage      decimal default 0,
  grade           text,
  remarks         text,
  time_taken      integer,
  tab_switches    integer default 0,
  ip_address      text,
  question_times  jsonb,
  started_at      timestamptz default now(),
  submitted_at    timestamptz,
  ai_feedback     text,
  unique (test_id, student_id)
);

-- ── Answers ───────────────────────────────────────────────────
create table if not exists answers (
  id                 uuid default uuid_generate_v4() primary key,
  submission_id      uuid references submissions(id) on delete cascade not null,
  question_id        uuid references questions(id) on delete cascade not null,
  selected_option_id uuid references options(id),
  text_answer        text,
  match_answer       jsonb,
  is_correct         boolean default false,
  marks_awarded      decimal default 0,
  similarity_score   decimal
);

-- ── Notifications ─────────────────────────────────────────────
create table if not exists notifications (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references profiles(id) on delete cascade not null,
  type        text not null,
  title       text not null,
  message     text,
  link        text,
  is_read     boolean default false,
  created_at  timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
alter table profiles        enable row level security;
alter table batches         enable row level security;
alter table batch_members   enable row level security;
alter table question_bank   enable row level security;
alter table tests           enable row level security;
alter table sections        enable row level security;
alter table questions       enable row level security;
alter table options         enable row level security;
alter table submissions     enable row level security;
alter table answers         enable row level security;
alter table notifications   enable row level security;

-- Profiles
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_update" on profiles;
drop policy if exists "profiles_insert" on profiles;
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);

-- Batches
drop policy if exists "batches_all"    on batches;
drop policy if exists "batches_select" on batches;
create policy "batches_all"    on batches for all    using (teacher_id = auth.uid());
create policy "batches_select" on batches for select using (true);

-- Batch members
drop policy if exists "bm_all" on batch_members;
create policy "bm_all" on batch_members for all using (true);

-- Question bank
drop policy if exists "qb_all" on question_bank;
create policy "qb_all" on question_bank for all using (teacher_id = auth.uid());

-- Tests
drop policy if exists "tests_teacher" on tests;
drop policy if exists "tests_student" on tests;
create policy "tests_teacher" on tests for all    using (teacher_id = auth.uid());
create policy "tests_student" on tests for select using (is_published = true);

-- Sections
drop policy if exists "sections_teacher" on sections;
drop policy if exists "sections_student" on sections;
create policy "sections_teacher" on sections for all
  using (test_id in (select id from tests where teacher_id = auth.uid()));
create policy "sections_student" on sections for select
  using (test_id in (select id from tests where is_published = true));

-- Questions
drop policy if exists "questions_teacher" on questions;
drop policy if exists "questions_student" on questions;
create policy "questions_teacher" on questions for all
  using (test_id in (select id from tests where teacher_id = auth.uid()));
create policy "questions_student" on questions for select
  using (test_id in (select id from tests where is_published = true));

-- Options
drop policy if exists "options_teacher" on options;
drop policy if exists "options_student" on options;
create policy "options_teacher" on options for all
  using (question_id in (select q.id from questions q join tests t on q.test_id=t.id where t.teacher_id=auth.uid()));
create policy "options_student" on options for select
  using (question_id in (select q.id from questions q join tests t on q.test_id=t.id where t.is_published=true));

-- Submissions
drop policy if exists "subs_student" on submissions;
drop policy if exists "subs_teacher" on submissions;
create policy "subs_student" on submissions for all   using (student_id = auth.uid());
create policy "subs_teacher" on submissions for select
  using (test_id in (select id from tests where teacher_id = auth.uid()));

-- Answers
drop policy if exists "ans_student" on answers;
drop policy if exists "ans_teacher" on answers;
create policy "ans_student" on answers for all
  using (submission_id in (select id from submissions where student_id = auth.uid()));
create policy "ans_teacher" on answers for select
  using (submission_id in (select s.id from submissions s join tests t on s.test_id=t.id where t.teacher_id=auth.uid()));

-- Notifications
drop policy if exists "notif_all" on notifications;
create policy "notif_all" on notifications for all using (user_id = auth.uid());

-- ── Supabase Storage buckets ─────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('avatars',    'avatars',    true),
         ('question-images', 'question-images', true)
  on conflict do nothing;

create policy "Avatar upload"  on storage.objects for insert with check (bucket_id='avatars');
create policy "Avatar read"    on storage.objects for select using (bucket_id='avatars');
create policy "Image upload"   on storage.objects for insert with check (bucket_id='question-images');
create policy "Image read"     on storage.objects for select using (bucket_id='question-images');
