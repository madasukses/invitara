// ============================================================
// INVITARA — Utility Helpers
// Dipakai di semua halaman
// ============================================================

// Ambil value input/select/textarea by id
function v(id) { return document.getElementById(id)?.value || '' }

// Set teks elemen
function setText(id, t) { const el = document.getElementById(id); if (el) el.textContent = t }

// Set value input
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val }

// Clear beberapa form field
function clearForm(ids) { ids.forEach(id => setVal(id, '')) }

// Show/hide spinner
function showSpinner(show) {
  const el = document.getElementById('spinner')
  if (el) el.classList.toggle('show', show)
}

// Toast notifikasi
function toast(msg, type = 'ok', duration = 3000) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = msg
  el.style.background = type === 'err' ? '#D94F4F' : type === 'warn' ? '#E0944A' : '#2C2420'
  el.classList.add('show')
  clearTimeout(el._timeout)
  el._timeout = setTimeout(() => el.classList.remove('show'), duration)
}

// Modal
function openModal(id)  { document.getElementById(id)?.classList.add('show') }
function closeModal(id) { document.getElementById(id)?.classList.remove('show') }

// Format angka ke Rupiah
function rupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }

// Format tanggal Indonesia
function formatTanggal(str) {
  if (!str) return ''
  const bl = ['','Januari','Februari','Maret','April','Mei','Juni',
               'Juli','Agustus','September','Oktober','November','Desember']
  const [y, m, d] = str.split('-')
  return `${parseInt(d)} ${bl[parseInt(m)]} ${y}`
}

// Format tanggal + jam
function formatDateTime(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
}

// Redirect dengan cek session
async function requireAuth(role = null) {
  const session = await getSession()
  if (!session) { window.location.href = 'auth.html'; return null }

  const meta = session.user.user_metadata
  const emailFromAuth = session.user.email
  const namaFromMeta  = meta?.full_name || meta?.name || emailFromAuth?.split('@')[0] || 'Pengguna'

  let profile = await getProfile(session.user.id)

  // Profile belum ada sama sekali (trigger gagal)
  if (!profile) {
    await sb.from('profiles').upsert({
      id:    session.user.id,
      email: emailFromAuth,
      nama:  namaFromMeta,
      role:  'customer'
    }, { onConflict: 'id' })
    profile = await getProfile(session.user.id)
  }

  // Profile ada tapi nama/email kosong (sering terjadi pada Google OAuth)
  if (profile && (!profile.nama || !profile.email)) {
    const patch = {}
    if (!profile.nama)  patch.nama  = namaFromMeta
    if (!profile.email) patch.email = emailFromAuth
    await sb.from('profiles').update(patch).eq('id', session.user.id)
    profile = { ...profile, ...patch }
  }

  if (role && profile?.role !== role) {
    window.location.href = profile?.role === 'admin' ? 'dashboard-admin.html' : 'dashboard-customer.html'
    return null
  }
  return { session, profile }
}

// Debounce
function debounce(fn, ms = 300) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

// Filter tabel dengan search
function filterTable(tableId, keyword) {
  const tbl = document.getElementById(tableId)
  if (!tbl) return
  const kw = keyword.toLowerCase()
  tbl.querySelectorAll('tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(kw) ? '' : 'none'
  })
}

// Copy ke clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast('Link disalin!'))
}

// Konfirmasi hapus universal
let _hapusFn = null
function triggerHapus(text, fn) {
  _hapusFn = fn
  setText('hapus-text', text)
  document.getElementById('hapus-confirm-btn').onclick = async () => {
    closeModal('modal-hapus')
    if (_hapusFn) { await _hapusFn(); _hapusFn = null }
  }
  openModal('modal-hapus')
}
