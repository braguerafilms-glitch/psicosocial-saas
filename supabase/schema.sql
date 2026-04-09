-- Psicossocial SST — esquema base (execute no SQL Editor do Supabase)

create extension if not exists "pgcrypto";

create table if not exists public.sst_engineers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  crea text not null,
  company_name text not null,
  logo_url text,
  email text not null,
  phone text,
  website text,
  city text,
  state text,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  engineer_id uuid not null references public.sst_engineers (id) on delete cascade,
  name text not null,
  trade_name text,
  cnpj text,
  logo_url text,
  industry text,
  city text,
  state text,
  contact_name text,
  contact_email text,
  contact_phone text,
  employee_count int,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  engineer_id uuid not null references public.sst_engineers (id) on delete cascade,
  title text not null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed', 'reported')),
  opens_at timestamptz,
  closes_at timestamptz,
  custom_message text,
  anonymous boolean not null default true,
  sectors text[] not null default '{}',
  job_levels text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists campaigns_engineer_id_idx on public.campaigns (engineer_id);
create index if not exists campaigns_company_id_idx on public.campaigns (company_id);

-- Migração: setores e cargos configuráveis por campanha
-- Execute no SQL Editor do Supabase se o banco já existir:
-- alter table public.campaigns add column if not exists sectors text[] not null default '{}';
-- alter table public.campaigns add column if not exists job_levels text[] not null default '{}';

create table if not exists public.employee_responses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  department text,
  job_level text,
  gender text,
  age_range text,
  tenure_range text,
  work_type text,
  submitted_at timestamptz not null default now()
);

create index if not exists employee_responses_campaign_id_idx on public.employee_responses (campaign_id);

create table if not exists public.question_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.employee_responses (id) on delete cascade,
  question_id int not null check (question_id >= 1 and question_id <= 35),
  score int not null check (score >= 1 and score <= 5),
  unique (response_id, question_id)
);

create index if not exists question_answers_response_id_idx on public.question_answers (response_id);

alter table public.sst_engineers enable row level security;
alter table public.companies enable row level security;
alter table public.campaigns enable row level security;
alter table public.employee_responses enable row level security;
alter table public.question_answers enable row level security;

-- Engenheiro: próprio registro
create policy "engineers_select_own"
on public.sst_engineers for select
using (auth.uid() = user_id);

create policy "engineers_insert_own"
on public.sst_engineers for insert
with check (auth.uid() = user_id);

create policy "engineers_update_own"
on public.sst_engineers for update
using (auth.uid() = user_id);

-- Empresas do engenheiro
create policy "companies_rw_engineer"
on public.companies for all
using (
  exists (
    select 1 from public.sst_engineers e
    where e.id = companies.engineer_id and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.sst_engineers e
    where e.id = companies.engineer_id and e.user_id = auth.uid()
  )
);

-- Campanhas do engenheiro
create policy "campaigns_rw_engineer"
on public.campaigns for all
using (
  exists (
    select 1 from public.sst_engineers e
    where e.id = campaigns.engineer_id and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.sst_engineers e
    where e.id = campaigns.engineer_id and e.user_id = auth.uid()
  )
);

-- Leitura pública de campanhas ativas (formulário)
create policy "campaigns_select_public_active"
on public.campaigns for select
to anon, authenticated
using (status = 'active');

-- Respostas: inserção pública apenas em campanha ativa
create policy "responses_insert_public_active"
on public.employee_responses for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.campaigns c
    where c.id = employee_responses.campaign_id and c.status = 'active'
  )
);

-- Respostas: leitura pelo engenheiro dono da campanha
create policy "responses_select_engineer"
on public.employee_responses for select
using (
  exists (
    select 1
    from public.campaigns c
    join public.sst_engineers e on e.id = c.engineer_id
    where c.id = employee_responses.campaign_id and e.user_id = auth.uid()
  )
);

-- Respostas: leitura pública não permitida (apenas insert)

-- Respostas às questões
create policy "answers_insert_public"
on public.question_answers for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.employee_responses er
    join public.campaigns c on c.id = er.campaign_id
    where er.id = question_answers.response_id and c.status = 'active'
  )
);

create policy "answers_select_engineer"
on public.question_answers for select
using (
  exists (
    select 1
    from public.employee_responses er
    join public.campaigns c on c.id = er.campaign_id
    join public.sst_engineers e on e.id = c.engineer_id
    where er.id = question_answers.response_id and e.user_id = auth.uid()
  )
);

-- Participantes autorizados por campanha (CPFs hasheados)
create table if not exists public.campaign_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  cpf_hash text not null,
  responded_at timestamptz,
  unique (campaign_id, cpf_hash)
);

create index if not exists campaign_participants_campaign_id_idx
  on public.campaign_participants (campaign_id);

alter table public.campaign_participants enable row level security;

-- Engenheiro: acesso total aos participantes das suas campanhas
create policy "participants_rw_engineer"
on public.campaign_participants for all
using (
  exists (
    select 1 from public.campaigns c
    join public.sst_engineers e on e.id = c.engineer_id
    where c.id = campaign_participants.campaign_id and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.campaigns c
    join public.sst_engineers e on e.id = c.engineer_id
    where c.id = campaign_participants.campaign_id and e.user_id = auth.uid()
  )
);

-- Anon: leitura para validar CPF no formulário público
create policy "participants_select_anon"
on public.campaign_participants for select
to anon, authenticated
using (true);

-- Anon: pode marcar responded_at apenas se ainda não respondeu
create policy "participants_update_anon"
on public.campaign_participants for update
to anon, authenticated
using (responded_at is null)
with check (responded_at is not null);

-- Migração (execute se o banco já existir):
-- Ver bloco CREATE TABLE acima e rodar manualmente no SQL Editor.

-- Storage: bucket logos (crie o bucket "logos" como público ou com políticas adequadas)
-- Policies de Storage devem ser configuradas na UI do Supabase para o bucket `logos`.
