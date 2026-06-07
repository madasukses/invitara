// ============================================================
// INVITARA — Supabase Config
// Ganti SUPABASE_URL dan SUPABASE_KEY dengan milik Anda
// Dapatkan di: Supabase Dashboard → Settings → API
// ============================================================

const SUPABASE_URL = 'https://XXXXXXXXXXXXXXXX.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.GANTI_DENGAN_ANON_KEY_ANDA'

const HARGA = { standar: 69000, premium: 120000 }
const CS    = { wa: '628123456789', email: 'support@invitara.id', jam: 'Senin–Sabtu, 08.00–20.00 WIB' }

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

async function getSession() {
  const { data: { session } } = await sb.auth.getSession()
  return session
}
async function getProfile(userId) {
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single()
  return data
}
