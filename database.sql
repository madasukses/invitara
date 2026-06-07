-- ============================================================
-- INVITARA — Supabase Database Schema
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type user_role      as enum ('admin', 'customer');
create type paket_type     as enum ('gratis', 'standar', 'premium');
create type payment_status as enum ('pending', 'paid', 'failed', 'expired');
create type rsvp_status    as enum ('hadir', 'tidak_hadir', 'belum');
create type musik_source   as enum ('soundcloud', 'youtube', 'gdrive', 'url_lain');
create type asset_tipe     as enum (
  'background_utama','background_section',
  'ornamen_atas','ornamen_bawah','ornamen_kiri','ornamen_kanan',
  'divider','pattern','frame_foto','icon_acara'
);

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text,
  email       text,
  no_hp       text,
  role        user_role default 'customer',
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile saat user daftar
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, nama, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'customer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- 2. TEMA
-- ============================================================
create table tema (
  id              uuid primary key default uuid_generate_v4(),
  nama            text not null,
  konsep          text,
  kategori        text,        -- 'Modern','Floral','Adat','Islami','Outdoor','Minimalis'
  paket_min       paket_type default 'gratis',
  urutan          int default 0,
  aktif           boolean default true,
  thumbnail_url   text,        -- gambar preview kecil 400x300
  preview_url     text,        -- preview full undangan
  file_template   text,        -- nama file di folder templates/ misal: sakura.html
  warna_primer    text default '#C97B84',
  warna_sekunder  text default '#C9A96E',
  warna_bg        text default '#FAF7F2',
  warna_teks      text default '#2C2420',
  font_judul      text default 'Playfair Display',
  font_body       text default 'Plus Jakarta Sans',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 3. TEMA ASSETS
-- ============================================================
create table tema_asset (
  id          uuid primary key default uuid_generate_v4(),
  tema_id     uuid references tema(id) on delete cascade,
  tipe        asset_tipe not null,
  nama        text,
  url         text not null,
  urutan      int default 1,
  created_at  timestamptz default now()
);

-- Seed tema awal
insert into tema (nama, konsep, kategori, paket_min, urutan, warna_primer, warna_sekunder, warna_bg, file_template) values
  ('Sakura Garden',   'Bunga sakura merah muda lembut, nuansa Jepang romantis',      'Floral',    'gratis',  1, '#E8889A', '#F5C5CE', '#FDF8F8', 'sakura.html'),
  ('Royal Gold',      'Ornamen emas mewah, latar krem elegan, nuansa kerajaan',      'Modern',    'gratis',  2, '#B8860B', '#C9A96E', '#FEFBF3', 'royal-gold.html'),
  ('Tropis Bali',     'Daun tropis hijau segar, ornamen khas Bali eksotis',          'Outdoor',   'standar', 3, '#4A7A4A', '#7A9E7E', '#F5FBF5', 'tropis-bali.html'),
  ('Minimalis Putih', 'Bersih, tipografi kuat, tanpa ornamen berlebihan',            'Minimalis', 'gratis',  4, '#4A4A4A', '#888888', '#FFFFFF', 'minimalis.html'),
  ('Batik Kawung',    'Motif kawung khas Solo, nuansa Jawa klasik berwibawa',        'Adat',      'standar', 5, '#6B3A2A', '#C4956A', '#FDF5EC', 'batik-kawung.html'),
  ('Batik Parang',    'Motif parang, coklat-emas elegan, nuansa keraton Yogyakarta', 'Adat',      'standar', 6, '#5C2E1A', '#A0785A', '#FEF9F4', 'batik-parang.html'),
  ('Islami Hijau',    'Ornamen arabesque hijau, kaligrafi, nuansa Islami khusyuk',   'Islami',    'gratis',  7, '#2D6A4F', '#74C69D', '#F0FFF4', 'islami-hijau.html'),
  ('Blue Ocean',      'Biru laut, segar dan romantis, cocok untuk outdoor',          'Outdoor',   'premium', 8, '#1A6FA8', '#4A9FD4', '#F0F8FF', 'blue-ocean.html');

-- ============================================================
-- 4. MUSIK
-- ============================================================
create table musik (
  id          uuid primary key default uuid_generate_v4(),
  judul       text not null,
  artis       text,
  kategori    text,
  -- kategori: 'Instrumental','Jazz','Pop Romantis','Pop Indonesia',
  --           'R&B','Country','Folk','Islami','Tradisional'
  source      musik_source default 'soundcloud',
  url         text,
  durasi_detik int,
  paket_min   paket_type default 'gratis',
  urutan      int default 0,
  aktif       boolean default true,
  created_at  timestamptz default now()
);

insert into musik (judul, artis, kategori, source, paket_min, urutan) values
  ('Canon in D',            'Pachelbel',             'Instrumental',  'soundcloud', 'gratis',  1),
  ('A Thousand Years',      'Christina Perri',       'Pop Romantis',  'soundcloud', 'gratis',  2),
  ('Perfect',               'Ed Sheeran',            'Pop Romantis',  'soundcloud', 'gratis',  3),
  ('Fly Me to the Moon',    'Frank Sinatra',         'Jazz',          'soundcloud', 'gratis',  4),
  ('La Vie en Rose',        'Edith Piaf',            'Jazz',          'soundcloud', 'standar', 5),
  ('All of Me',             'John Legend',           'R&B',           'soundcloud', 'gratis',  6),
  ('River Flows in You',    'Yiruma',                'Instrumental',  'soundcloud', 'gratis',  7),
  ('Kiss the Rain',         'Yiruma',                'Instrumental',  'soundcloud', 'standar', 8),
  ('Satu',                  'Padi',                  'Pop Indonesia', 'soundcloud', 'gratis',  9),
  ('Sempurna',              'Andra & The Backbone',  'Pop Indonesia', 'soundcloud', 'gratis',  10),
  ('Kamulah Satu-Satunya',  'Kerispatih',            'Pop Indonesia', 'soundcloud', 'gratis',  11),
  ('At Last',               'Etta James',            'Jazz',          'soundcloud', 'standar', 12),
  ('Thinking Out Loud',     'Ed Sheeran',            'Pop Romantis',  'soundcloud', 'gratis',  13),
  ('Clair de Lune',         'Debussy',               'Instrumental',  'soundcloud', 'premium', 14),
  ('Takdir Cinta',          'Bunga Citra Lestari',   'Pop Indonesia', 'soundcloud', 'gratis',  15),
  ('Assalamualaikum',       'Opick',                 'Islami',        'soundcloud', 'gratis',  16),
  ('Sedari Dulu',           'Tompi',                 'Jazz',          'soundcloud', 'standar', 17),
  ('Make You Feel My Love', 'Adele',                 'Pop Romantis',  'soundcloud', 'gratis',  18),
  ('Bengawan Solo',         'Gesang',                'Tradisional',   'soundcloud', 'gratis',  19),
  ('Bless the Broken Road', 'Rascal Flatts',         'Country',       'soundcloud', 'standar', 20);

-- ============================================================
-- 5. FILTER IG TEMPLATES
-- Format: 1080x1920 portrait (Instagram Story)
-- PNG transparan di folder images/filter-ig-frames/
-- ============================================================
create table filter_ig (
  id                uuid primary key default uuid_generate_v4(),
  nama              text not null,
  kategori          text,
  thumbnail_url     text,
  template_url      text not null,   -- path ke PNG frame, mis: images/filter-ig-frames/sakura-story.png
  paket_min         paket_type default 'gratis',
  urutan            int default 0,
  aktif             boolean default true,
  -- Konfigurasi posisi teks di canvas 1080x1920
  nama_x            int default 540,
  nama_y            int default 1550,
  nama_font_size    int default 80,
  nama_font         text default 'Great Vibes',
  nama_warna        text default '#4A3728',
  tanggal_x         int default 540,
  tanggal_y         int default 1660,
  tanggal_font_size int default 42,
  tanggal_font      text default 'Plus Jakarta Sans',
  tanggal_warna     text default '#7A6E6A',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

insert into filter_ig (nama, kategori, template_url, paket_min, urutan, nama_y, nama_font_size, tanggal_y) values
  ('Sakura Story',     'Floral',    'images/filter-ig-frames/sakura-story.svg',    'gratis',  1, 1550, 80, 1660),
  ('Gold Ornament',    'Modern',    'images/filter-ig-frames/gold-story.svg',      'gratis',  2, 1540, 76, 1650),
  ('Batik Kawung',     'Adat',      'images/filter-ig-frames/batik-story.svg',     'standar', 3, 1560, 72, 1665),
  ('Minimalis Line',   'Minimalis', 'images/filter-ig-frames/minimalis-story.svg', 'gratis',  4, 1570, 74, 1670),
  ('Islami Green',     'Islami',    'images/filter-ig-frames/islami-story.svg',    'gratis',  5, 1550, 78, 1660),
  ('Tropical Bali',    'Outdoor',   'images/filter-ig-frames/tropis-story.svg',    'standar', 6, 1545, 76, 1655);

-- ============================================================
-- 6. UNDANGAN
-- ============================================================
create table undangan (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles(id) on delete cascade,
  slug            text unique,
  paket           paket_type default 'gratis',
  tema_id         uuid references tema(id),
  -- Fitur opsional on/off
  fitur_galeri    boolean default false,
  fitur_musik     boolean default false,
  fitur_ucapan    boolean default true,
  fitur_kado      boolean default false,
  fitur_rsvp      boolean default true,
  fitur_streaming boolean default false,
  fitur_story     boolean default false,
  fitur_filter    boolean default false,
  fitur_quote     boolean default false,
  is_published    boolean default false,
  views           int default 0,
  expires_at      timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 7. PENGANTIN
-- ============================================================
create table pengantin (
  id              uuid primary key default uuid_generate_v4(),
  undangan_id     uuid references undangan(id) on delete cascade,
  urutan          int default 1,   -- 1=pria, 2=wanita
  nama_lengkap    text,
  nama_panggilan  text,
  anak_ke         text,
  nama_ayah       text,
  nama_ibu        text,
  foto_url        text,
  instagram       text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 8. ACARA
-- ============================================================
create table acara (
  id          uuid primary key default uuid_generate_v4(),
  undangan_id uuid references undangan(id) on delete cascade,
  urutan      int default 1,   -- 1=akad, 2=resepsi
  nama        text,
  tanggal     date,
  jam_mulai   time,
  jam_selesai time,
  lokasi_nama text,
  alamat      text,
  maps_url    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- 9. GALERI
-- ============================================================
create table galeri (
  id          uuid primary key default uuid_generate_v4(),
  undangan_id uuid references undangan(id) on delete cascade,
  urutan      int default 1,
  foto_url    text not null,
  caption     text,
  created_at  timestamptz default now()
);

-- ============================================================
-- 10. UNDANGAN MUSIK
-- ============================================================
create table undangan_musik (
  id          uuid primary key default uuid_generate_v4(),
  undangan_id uuid references undangan(id) on delete cascade,
  musik_id    uuid references musik(id),
  custom_url  text,
  autoplay    boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- 11. KISAH CINTA
-- ============================================================
create table kisah_cinta (
  id          uuid primary key default uuid_generate_v4(),
  undangan_id uuid references undangan(id) on delete cascade,
  urutan      int default 1,
  tahun       text,
  judul       text,
  cerita      text,
  foto_url    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- 12. PENGATURAN TEKS
-- ============================================================
create table pengaturan_teks (
  id                  uuid primary key default uuid_generate_v4(),
  undangan_id         uuid references undangan(id) on delete cascade unique,
  teks_pembuka        text default 'Bismillahirrahmanirrahim',
  teks_undangan       text default 'Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di hari bahagia kami.',
  teks_penutup        text default 'Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir. Atas kehadiran dan doa restu, kami ucapkan terima kasih.',
  label_hadir         text default 'Insyaallah Hadir',
  label_tidak_hadir   text default 'Mohon Maaf, Tidak Hadir',
  quote_text          text,
  quote_sumber        text,
  updated_at          timestamptz default now()
);

-- ============================================================
-- 13. KADO
-- ============================================================
create table kado (
  id          uuid primary key default uuid_generate_v4(),
  undangan_id uuid references undangan(id) on delete cascade,
  tipe        text,   -- 'bank','gopay','ovo','dana','shopee'
  nama_bank   text,
  no_rekening text,
  atas_nama   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- 14. BUKU TAMU
-- ============================================================
create table buku_tamu (
  id          uuid primary key default uuid_generate_v4(),
  undangan_id uuid references undangan(id) on delete cascade,
  nama        text not null,
  no_hp       text,
  kelompok    text,
  sudah_kirim boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- 15. RSVP & UCAPAN (diisi tamu)
-- ============================================================
create table rsvp (
  id            uuid primary key default uuid_generate_v4(),
  undangan_id   uuid references undangan(id) on delete cascade,
  nama          text not null,
  no_hp         text,
  status        rsvp_status default 'belum',
  jumlah_hadir  int default 1,
  ucapan        text,
  created_at    timestamptz default now()
);

-- ============================================================
-- 16. STREAMING
-- ============================================================
create table streaming (
  id          uuid primary key default uuid_generate_v4(),
  undangan_id uuid references undangan(id) on delete cascade unique,
  youtube_url text,
  catatan     text,
  updated_at  timestamptz default now()
);

-- ============================================================
-- 17. UNDANGAN FILTER IG (dipilih customer)
-- ============================================================
create table undangan_filter_ig (
  id            uuid primary key default uuid_generate_v4(),
  undangan_id   uuid references undangan(id) on delete cascade,
  filter_ig_id  uuid references filter_ig(id),
  created_at    timestamptz default now()
);

-- ============================================================
-- 18. TRANSAKSI
-- ============================================================
create table transaksi (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references profiles(id),
  undangan_id         uuid references undangan(id),
  paket               paket_type not null,
  nominal             int not null,
  status              payment_status default 'pending',
  midtrans_order_id   text unique,
  midtrans_token      text,
  midtrans_url        text,
  paid_at             timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- 19. PENGATURAN SISTEM (key-value)
-- ============================================================
create table pengaturan_sistem (
  key         text primary key,
  value       text,
  updated_at  timestamptz default now()
);

insert into pengaturan_sistem (key, value) values
  ('app_name',        'Invitara'),
  ('app_url',         'https://invitara.id'),
  ('tagline',         'Undangan Digital Pernikahan'),
  ('wa_cs',           '628123456789'),
  ('email_cs',        'support@invitara.id'),
  ('jam_cs',          'Senin–Sabtu, 08.00–20.00 WIB'),
  ('harga_standar',   '69000'),
  ('harga_premium',   '120000'),
  ('midtrans_env',    'sandbox');

-- ============================================================
-- 20. AUTO updated_at TRIGGER
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_upd         before update on profiles         for each row execute procedure set_updated_at();
create trigger trg_tema_upd             before update on tema             for each row execute procedure set_updated_at();
create trigger trg_filter_ig_upd        before update on filter_ig        for each row execute procedure set_updated_at();
create trigger trg_undangan_upd         before update on undangan         for each row execute procedure set_updated_at();
create trigger trg_pengantin_upd        before update on pengantin        for each row execute procedure set_updated_at();
create trigger trg_acara_upd            before update on acara            for each row execute procedure set_updated_at();
create trigger trg_kisah_upd            before update on kisah_cinta      for each row execute procedure set_updated_at();
create trigger trg_pengaturan_upd       before update on pengaturan_teks  for each row execute procedure set_updated_at();
create trigger trg_kado_upd             before update on kado             for each row execute procedure set_updated_at();
create trigger trg_buku_tamu_upd        before update on buku_tamu        for each row execute procedure set_updated_at();
create trigger trg_transaksi_upd        before update on transaksi        for each row execute procedure set_updated_at();

-- ============================================================
-- 21. ROW LEVEL SECURITY
-- ============================================================
alter table profiles            enable row level security;
alter table tema                enable row level security;
alter table tema_asset          enable row level security;
alter table musik               enable row level security;
alter table filter_ig           enable row level security;
alter table undangan            enable row level security;
alter table pengantin           enable row level security;
alter table acara               enable row level security;
alter table galeri              enable row level security;
alter table kisah_cinta         enable row level security;
alter table pengaturan_teks     enable row level security;
alter table kado                enable row level security;
alter table buku_tamu           enable row level security;
alter table rsvp                enable row level security;
alter table streaming           enable row level security;
alter table undangan_musik      enable row level security;
alter table undangan_filter_ig  enable row level security;
alter table transaksi           enable row level security;
alter table pengaturan_sistem   enable row level security;

-- Helper: cek admin
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- PROFILES
create policy "Lihat profil sendiri"     on profiles for select using (id = auth.uid() or is_admin());
create policy "Update profil sendiri"    on profiles for update using (id = auth.uid());

-- KONTEN PUBLIK (tema, musik, filter_ig) — semua bisa lihat yang aktif
create policy "Publik lihat tema"        on tema       for select using (aktif = true or is_admin());
create policy "Admin kelola tema"        on tema       for all    using (is_admin());
create policy "Publik lihat tema asset"  on tema_asset for select using (true);
create policy "Admin kelola tema asset"  on tema_asset for all    using (is_admin());
create policy "Publik lihat musik"       on musik      for select using (aktif = true or is_admin());
create policy "Admin kelola musik"       on musik      for all    using (is_admin());
create policy "Publik lihat filter ig"   on filter_ig  for select using (aktif = true or is_admin());
create policy "Admin kelola filter ig"   on filter_ig  for all    using (is_admin());

-- PENGATURAN SISTEM
create policy "Admin baca pengaturan"    on pengaturan_sistem for select using (is_admin());
create policy "Admin kelola pengaturan"  on pengaturan_sistem for all    using (is_admin());

-- UNDANGAN
create policy "Lihat undangan sendiri"   on undangan for select using (user_id = auth.uid() or is_admin());
create policy "Buat undangan"            on undangan for insert with check (user_id = auth.uid());
create policy "Update undangan sendiri"  on undangan for update using (user_id = auth.uid() or is_admin());
create policy "Admin hapus undangan"     on undangan for delete using (is_admin());
create policy "Publik lihat published"   on undangan for select using (is_published = true);

-- TAMU bisa isi RSVP tanpa login
create policy "Tamu isi RSVP"           on rsvp for insert with check (true);
create policy "Publik lihat ucapan"     on rsvp for select using (
  undangan_id in (select id from undangan where is_published = true) or
  undangan_id in (select id from undangan where user_id = auth.uid()) or
  is_admin()
);
create policy "Pemilik/admin hapus rsvp" on rsvp for delete using (
  undangan_id in (select id from undangan where user_id = auth.uid()) or is_admin()
);

-- TRANSAKSI
create policy "Lihat transaksi sendiri" on transaksi for select using (user_id = auth.uid() or is_admin());
create policy "Buat transaksi"          on transaksi for insert with check (user_id = auth.uid());
create policy "Admin update transaksi"  on transaksi for update using (is_admin());

-- Tabel turunan undangan — pemilik + admin
do $$ declare tbl text;
begin
  foreach tbl in array array[
    'pengantin','acara','galeri','kisah_cinta','pengaturan_teks',
    'kado','buku_tamu','undangan_musik','undangan_filter_ig','streaming'
  ] loop
    execute format($f$
      create policy "Select %1$s" on %1$s for select using (
        undangan_id in (select id from undangan where user_id = auth.uid()) or
        undangan_id in (select id from undangan where is_published = true) or
        is_admin());
      create policy "Insert %1$s" on %1$s for insert with check (
        undangan_id in (select id from undangan where user_id = auth.uid()) or is_admin());
      create policy "Update %1$s" on %1$s for update using (
        undangan_id in (select id from undangan where user_id = auth.uid()) or is_admin());
      create policy "Delete %1$s" on %1$s for delete using (
        undangan_id in (select id from undangan where user_id = auth.uid()) or is_admin());
    $f$, tbl);
  end loop;
end $$;

-- ============================================================
-- 22. STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('foto-pengantin', 'foto-pengantin', true),
  ('galeri',         'galeri',         true),
  ('filter-ig',      'filter-ig',      true),
  ('tema-assets',    'tema-assets',    true),
  ('tema-preview',   'tema-preview',   true)
on conflict do nothing;

create policy "Auth upload foto pengantin" on storage.objects for insert with check (bucket_id='foto-pengantin' and auth.role()='authenticated');
create policy "Publik baca foto pengantin" on storage.objects for select using (bucket_id='foto-pengantin');
create policy "Auth upload galeri"         on storage.objects for insert with check (bucket_id='galeri' and auth.role()='authenticated');
create policy "Publik baca galeri"         on storage.objects for select using (bucket_id='galeri');
create policy "Admin upload filter ig"     on storage.objects for insert with check (bucket_id='filter-ig' and is_admin());
create policy "Publik baca filter ig"      on storage.objects for select using (bucket_id='filter-ig');
create policy "Admin kelola tema assets"   on storage.objects for all   using (bucket_id='tema-assets' and is_admin());
create policy "Publik baca tema assets"    on storage.objects for select using (bucket_id='tema-assets');
create policy "Admin kelola tema preview"  on storage.objects for all   using (bucket_id='tema-preview' and is_admin());
create policy "Publik baca tema preview"   on storage.objects for select using (bucket_id='tema-preview');

-- ============================================================
-- 23. VIEWS ADMIN
-- ============================================================
create or replace view v_statistik_admin as
select
  (select count(*) from profiles where role='customer')              as total_customer,
  (select count(*) from undangan)                                     as total_undangan,
  (select count(*) from transaksi where status='paid')               as total_transaksi,
  (select coalesce(sum(nominal),0) from transaksi where status='paid') as total_pendapatan,
  (select count(*) from undangan where paket='gratis')               as paket_gratis,
  (select count(*) from undangan where paket='standar')              as paket_standar,
  (select count(*) from undangan where paket='premium')              as paket_premium,
  (select count(*) from musik where aktif=true)                      as total_musik,
  (select count(*) from tema where aktif=true)                       as total_tema,
  (select count(*) from filter_ig where aktif=true)                  as total_filter_ig;

create or replace view v_undangan_lengkap as
select
  u.id, u.slug, u.paket, u.is_published, u.views, u.created_at,
  p.nama as nama_customer, p.email as email_customer,
  t.nama as nama_tema, t.kategori as kategori_tema,
  (select count(*) from buku_tamu bt where bt.undangan_id=u.id)                    as jumlah_tamu,
  (select count(*) from rsvp r where r.undangan_id=u.id and r.status='hadir')      as jumlah_hadir,
  (select count(*) from rsvp r where r.undangan_id=u.id)                           as total_rsvp,
  (select nama_panggilan from pengantin where undangan_id=u.id and urutan=1 limit 1) as nama_pria,
  (select nama_panggilan from pengantin where undangan_id=u.id and urutan=2 limit 1) as nama_wanita
from undangan u
join profiles p on p.id=u.user_id
left join tema t on t.id=u.tema_id;

-- ============================================================
-- SELESAI!
-- Langkah selanjutnya:
-- 1. Jalankan SQL ini di Supabase SQL Editor
-- 2. Set admin: UPDATE profiles SET role='admin' WHERE email='email-anda@gmail.com';
-- 3. Aktifkan Auth providers: Dashboard > Authentication > Providers > Email + Google
-- 4. Copy SUPABASE_URL dan SUPABASE_ANON_KEY ke js/supabase-config.js
-- ============================================================
