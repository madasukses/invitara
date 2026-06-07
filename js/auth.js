// ============================================================
// INVITARA — Auth Functions
// ============================================================

async function doLogin() {
  const email    = v('login-email').trim()
  const password = v('login-password')
  if (!email || !password) return toast('Isi email dan kata sandi', 'warn')
  showSpinner(true)
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  showSpinner(false)
  if (error) return toast(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah' : error.message, 'err')
  const profile = await getProfile(data.user.id)
  window.location.href = profile?.role === 'admin' ? 'dashboard-admin.html' : 'dashboard-customer.html'
}

async function doRegister() {
  const nama     = v('reg-nama').trim()
  const email    = v('reg-email').trim()
  const password = v('reg-password')
  if (!nama || !email || !password) return toast('Lengkapi semua field', 'warn')
  if (password.length < 8) return toast('Kata sandi minimal 8 karakter', 'warn')
  showSpinner(true)
  const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: nama } } })
  showSpinner(false)
  if (error) return toast(error.message, 'err')
  toast('Akun berhasil dibuat! Cek email untuk verifikasi.')
  setTimeout(() => switchAuthTab('masuk'), 1500)
}

async function doGoogleLogin() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/auth.html' }
  })
  if (error) toast(error.message, 'err')
}

async function doForgotPassword() {
  const email = v('login-email').trim()
  if (!email) return toast('Masukkan email dulu', 'warn')
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/auth.html?reset=true'
  })
  if (error) return toast(error.message, 'err')
  toast('Link reset dikirim ke email Anda')
}

async function doLogout() {
  await sb.auth.signOut()
  window.location.href = 'index.html'
}

function switchAuthTab(tab) {
  document.getElementById('tab-masuk')?.classList.toggle('active', tab === 'masuk')
  document.getElementById('tab-daftar')?.classList.toggle('active', tab === 'daftar')
  const fm = document.getElementById('form-masuk')
  const fd = document.getElementById('form-daftar')
  if (fm) fm.style.display = tab === 'masuk'  ? 'block' : 'none'
  if (fd) fd.style.display = tab === 'daftar' ? 'block' : 'none'
}

// Handle redirect setelah Google OAuth
window.addEventListener('DOMContentLoaded', async () => {
  const hash = window.location.hash
  if (hash.includes('access_token')) {
    const { data: { session } } = await sb.auth.getSession()
    if (session) {
      const profile = await getProfile(session.user.id)
      window.location.href = profile?.role === 'admin' ? 'dashboard-admin.html' : 'dashboard-customer.html'
    }
  }
})
