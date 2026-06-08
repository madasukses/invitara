// ============================================================
// INVITARA — Supabase Config
// Ganti SUPABASE_URL dan SUPABASE_KEY dengan milik Anda
// Dapatkan di: Supabase Dashboard → Settings → API
// ============================================================

const SUPABASE_URL = 'https://nqdvecessynsovpatkax.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZHZlY2Vzc3luc292cGF0a2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTM5NjEsImV4cCI6MjA5NjQyOTk2MX0.S9ZoQqo2m6j7M3m2s1xhvuII3-lAJucOc68yF_Iocac'

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
