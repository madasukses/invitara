// ============================================================
// INVITARA — customer.js
// Semua logika dashboard customer
// ============================================================

let currentUser    = null
let currentProfile = null
let activeInvId    = null
let activeFeatureId = null
let selectedPaket  = null
let musikTerpilihId = null
let allMusikData   = []
let musikKatAktif  = 'Semua'
let musikSearch    = ''
let igActiveTpl    = null
let igWarnaAktif   = '#4A3728'

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const auth = await requireAuth('customer')
  if (!auth) return
  currentUser    = auth.session.user
  currentProfile = auth.profile
  initSidebar()
  loadStats()
  loadInvitations()
  loadRiwayatTransaksi()
  loadIGTemplates()
  initIGWarna()
  setDefaultDate()
  // set menu aktif dari URL hash
  const hash = window.location.hash.replace('#','') || 'dashboard'
  switchMenu(hash)
})

// ── SIDEBAR ───────────────────────────────────────────────────
function initSidebar() {
  setText('cust-name',   currentProfile.nama  || 'Pengguna')
  setText('cust-email',  currentProfile.email || '')
  document.getElementById('cust-avatar').textContent = (currentProfile.nama||'U')[0].toUpperCase()
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('show')
  document.getElementById('sidebar-overlay').classList.toggle('show')
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('show')
  document.getElementById('sidebar-overlay').classList.remove('show')
}

function switchMenu(menu) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  const navEl = document.querySelector(`[data-menu="${menu}"]`)
  if (navEl) navEl.classList.add('active')
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'))
  const sec = document.getElementById('sec-' + menu)
  if (sec) sec.classList.add('active')
  const titles = { dashboard:'Dashboard', undangan:'Undangan', 'filter-ig':'Filter Instagram', transaksi:'Upgrade Paket', cs:'Bantuan' }
  setText('main-title', titles[menu] || menu)
  window.location.hash = menu
  closeSidebar()
}

// ── STATISTIK ─────────────────────────────────────────────────
async function loadStats() {
  const { data: invs } = await sb.from('undangan').select('id,views').eq('user_id', currentUser.id)
  if (!invs?.length) return
  const ids   = invs.map(i => i.id)
  const views = invs.reduce((a,i) => a + (i.views||0), 0)
  const [{ count: tamu }, { count: hadir }, { count: ucapan }] = await Promise.all([
    sb.from('buku_tamu').select('*',{count:'exact',head:true}).in('undangan_id', ids),
    sb.from('rsvp').select('*',{count:'exact',head:true}).in('undangan_id', ids).eq('status','hadir'),
    sb.from('rsvp').select('*',{count:'exact',head:true}).in('undangan_id', ids).not('ucapan','is',null),
  ])
  setText('stat-tamu',   tamu   || 0)
  setText('stat-hadir',  hadir  || 0)
  setText('stat-ucapan', ucapan || 0)
  setText('stat-views',  views  || 0)
  setText('inv-count-badge', invs.length)
  // cek paket berbayar — sembunyikan banner gratis
  const { data: trx } = await sb.from('transaksi').select('paket').eq('user_id',currentUser.id).eq('status','paid').order('created_at',{ascending:false}).limit(1)
  if (trx?.length && trx[0].paket !== 'gratis') {
    const el = document.getElementById('banner-gratis')
    if (el) el.style.display = 'none'
  }
}

// ── UNDANGAN LIST ─────────────────────────────────────────────
async function loadInvitations() {
  const { data: invs } = await sb.from('undangan')
    .select('*, tema(nama,warna_primer,warna_sekunder)')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending:false })
  const container = document.getElementById('inv-list-container')
  if (!invs?.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
      <i class="ti ti-heart" style="font-size:40px;color:var(--rose-light);display:block;margin-bottom:12px;"></i>
      Belum ada undangan. Buat yang pertama!
    </div>`
    return
  }
  const ids = invs.map(i => i.id)
  const { data: allPg } = await sb.from('pengantin').select('undangan_id,nama_panggilan,urutan').in('undangan_id', ids)
  container.innerHTML = invs.map(inv => {
    const pg     = allPg?.filter(p => p.undangan_id === inv.id) || []
    const pria   = pg.find(p => p.urutan===1)?.nama_panggilan || '—'
    const wanita = pg.find(p => p.urutan===2)?.nama_panggilan || '—'
    const nama   = (pria!=='—'&&wanita!=='—') ? `${pria} & ${wanita}` : inv.slug||'Undangan Baru'
    const paket  = inv.paket || 'gratis'
    const temaBg = inv.tema ? `background:linear-gradient(135deg,${inv.tema.warna_primer||'#C97B84'},${inv.tema.warna_sekunder||'#C9A96E'})` : ''
    return `<div class="inv-card">
      <div class="inv-meta">
        <div class="inv-thumb" style="${temaBg}">💑</div>
        <div style="flex:1;min-width:0;">
          <div class="inv-name">${nama}</div>
          <div class="inv-date"><i class="ti ti-palette" style="font-size:11px;"></i> ${inv.tema?.nama||'Belum pilih tema'}</div>
          <div class="inv-status s-${paket}">${paket.toUpperCase()}</div>
        </div>
      </div>
      <div class="inv-actions">
        <div class="inv-btn" onclick="showKelola('${inv.id}')"><i class="ti ti-layout-grid"></i><span>Kelola</span></div>
        <div class="inv-btn" onclick="previewUndangan('${inv.slug||inv.id}')"><i class="ti ti-eye"></i><span>Preview</span></div>
        <div class="inv-btn" onclick="shareUndangan('${inv.slug||inv.id}')"><i class="ti ti-share"></i><span>Bagikan</span></div>
        <div class="inv-btn del" onclick="triggerHapus('Hapus undangan \\'${nama}\\'? Data tidak bisa dikembalikan.',()=>hapusUndangan('${inv.id}'))">
          <i class="ti ti-trash"></i><span>Hapus</span>
        </div>
      </div>
    </div>`
  }).join('')
}

async function hapusUndangan(id) {
  showSpinner(true)
  await sb.from('undangan').delete().eq('id', id)
  showSpinner(false)
  toast('Undangan dihapus')
  if (activeInvId === id) showListUndangan()
  loadInvitations()
  loadStats()
}

function showListUndangan() {
  document.getElementById('view-list').style.display   = 'block'
  document.getElementById('view-kelola').style.display = 'none'
  activeInvId = null; activeFeatureId = null
}

async function showKelola(invId) {
  document.getElementById('view-list').style.display   = 'none'
  document.getElementById('view-kelola').style.display = 'block'
  document.getElementById('feature-detail').style.display = 'none'
  activeFeatureId = null
  switchMenu('undangan')
  if (invId) {
    activeInvId = invId
    const { data: inv } = await sb.from('undangan').select('*,tema(nama)').eq('id', invId).single()
    if (inv) {
      const { data: pg } = await sb.from('pengantin').select('nama_panggilan,urutan').eq('undangan_id', invId)
      const pria   = pg?.find(p=>p.urutan===1)?.nama_panggilan || '—'
      const wanita = pg?.find(p=>p.urutan===2)?.nama_panggilan || '—'
      setText('kelola-title', pria!=='—'&&wanita!=='—' ? `${pria} & ${wanita}` : 'Kelola Undangan')
      setText('kelola-sub', inv.tema?.nama || 'Belum pilih tema')
      featuresOpsional.forEach(f => { featureState[f.id] = inv['fitur_'+f.id] ?? false })
      // stats kelola
      const ids = [invId]
      const [{ count: tm }, { count: hd }, { count: uc }] = await Promise.all([
        sb.from('buku_tamu').select('*',{count:'exact',head:true}).in('undangan_id',ids),
        sb.from('rsvp').select('*',{count:'exact',head:true}).in('undangan_id',ids).eq('status','hadir'),
        sb.from('rsvp').select('*',{count:'exact',head:true}).in('undangan_id',ids).not('ucapan','is',null),
      ])
      setText('k-tamu', tm||0); setText('k-hadir', hd||0)
      setText('k-ucapan', uc||0); setText('k-views', inv.views||0)
    }
  } else {
    activeInvId = await buatUndanganBaru()
  }
  renderFeatureGrid()
}

async function buatUndanganBaru() {
  showSpinner(true)
  const slug = 'undangan-' + Date.now()
  const { data, error } = await sb.from('undangan').insert({ user_id:currentUser.id, slug, paket:'gratis' }).select().single()
  if (error) { showSpinner(false); toast('Gagal membuat undangan','err'); return null }
  await sb.from('pengaturan_teks').insert({ undangan_id: data.id })
  showSpinner(false)
  toast('Undangan baru dibuat!')
  loadInvitations()
  return data.id
}

async function previewUndangan(slug) {
  // kalau dipanggil dari tombol kelola (tanpa slug), ambil slug dari DB
  if (!slug || slug === 'null' || slug === 'undefined') {
    if (!activeInvId) return toast('Pilih undangan dulu', 'warn')
    const { data } = await sb.from('undangan').select('slug').eq('id', activeInvId).single()
    slug = data?.slug
  }
  if (!slug) return toast('Slug undangan belum diset', 'warn')
  window.open(`/${slug}`, '_blank')
}
function shareUndangan(slug) {
  const url = `${window.location.origin}/${slug}`
  if (navigator.share) navigator.share({ title:'Undangan Pernikahan', url })
  else { copyToClipboard(url); toast('Link disalin!') }
}

// ── FEATURE GRID ──────────────────────────────────────────────
const featuresWajib = [
  { id:'pengantin', icon:'ti ti-user-heart',    label:'Pengantin',  desc:'Data mempelai' },
  { id:'tema',      icon:'ti ti-palette',        label:'Tema',       desc:'Pilih desain' },
  { id:'acara',     icon:'ti ti-calendar-event', label:'Acara',      desc:'Akad & resepsi' },
  { id:'setting',   icon:'ti ti-settings',       label:'Pengaturan', desc:'Kustomisasi teks' },
  { id:'buku',      icon:'ti ti-address-book',   label:'Buku Tamu',  desc:'Data tamu' },
  { id:'kirim',     icon:'ti ti-send',           label:'Kirim',      desc:'Kirim via WA' },
]
const featuresOpsional = [
  { id:'galeri',    icon:'ti ti-photo',         label:'Galeri',      desc:'Foto (1–5)' },
  { id:'musik',     icon:'ti ti-music',         label:'Musik',       desc:'Lagu latar' },
  { id:'ucapan',    icon:'ti ti-message-heart', label:'Ucapan',      desc:'Komentar tamu' },
  { id:'kado',      icon:'ti ti-gift',          label:'Kado',        desc:'Amplop digital' },
  { id:'rsvp',      icon:'ti ti-mail-forward',  label:'RSVP',        desc:'Konfirmasi hadir' },
  { id:'streaming', icon:'ti ti-device-tv',     label:'Streaming',   desc:'Link YouTube' },
  { id:'story',     icon:'ti ti-timeline',      label:'Kisah Cinta', desc:'Timeline' },
  { id:'filter',    icon:'ti ti-camera',        label:'Filter IG',   desc:'Bingkai foto' },
  { id:'quote',     icon:'ti ti-quote',         label:'Quote',       desc:'Kata pembuka' },
]
const featureState = {}
featuresOpsional.forEach(f => featureState[f.id] = false)

function renderFeatureGrid() {
  const gw = document.getElementById('feature-grid-wajib')
  const go = document.getElementById('feature-grid-opsional')
  if (!gw||!go) return
  gw.innerHTML = featuresWajib.map(f => `
    <div class="feature-item wajib-item${activeFeatureId===f.id?' active-feature':''}"
         onclick="showFeatureDetail('${f.id}','${f.label}','${f.icon}')">
      <i class="${f.icon} feat-icon-ti"></i>
      <div class="feature-label">${f.label}</div>
      <div class="feature-desc">${f.desc}</div>
    </div>`).join('')
  go.innerHTML = featuresOpsional.map(f => `
    <div class="feature-item${activeFeatureId===f.id?' active-feature':''}${!featureState[f.id]?' off-feature':''}"
         id="fitem-${f.id}">
      <div class="feature-toggle-row" onclick="toggleFeature('${f.id}',${!featureState[f.id]});event.stopPropagation()">
        <label class="toggle-switch" style="pointer-events:none;">
          <input type="checkbox" ${featureState[f.id]?'checked':''} readonly>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div onclick="showFeatureDetail('${f.id}','${f.label}','${f.icon}')" style="width:100%;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <i class="${f.icon} feat-icon-ti"></i>
        <div class="feature-label">${f.label}</div>
        <div class="feature-desc">${f.desc}</div>
      </div>
    </div>`).join('')
}

async function toggleFeature(id, val) {
  featureState[id] = val
  const el = document.getElementById('fitem-'+id)
  if (el) {
    el.classList.toggle('off-feature', !val)
    const cb = el.querySelector('input[type=checkbox]')
    if (cb) cb.checked = val
  }
  if (activeInvId) await sb.from('undangan').update({ ['fitur_'+id]: val }).eq('id', activeInvId)
}

async function showFeatureDetail(id, label, icon) {
  activeFeatureId = id
  renderFeatureGrid()
  const panel = document.getElementById('feature-detail')
  panel.style.display = 'block'
  panel.innerHTML = `<div class="detail-panel" style="margin-top:16px;">
    <div class="detail-panel-header">
      <div class="detail-panel-icon"><i class="${icon}" style="font-size:20px;color:var(--rose);"></i></div>
      <div style="flex:1;">
        <div class="detail-panel-title">${label}</div>
        <div style="font-size:11px;color:var(--text-muted);">Klik fitur lain untuk beralih</div>
      </div>
      <button onclick="tutupDetail()" style="width:34px;height:34px;border-radius:9px;background:var(--ivory);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="ti ti-x" style="font-size:16px;"></i>
      </button>
    </div>
    <div class="detail-panel-body" id="detail-body">
      <div style="text-align:center;padding:20px;color:var(--text-muted);">Memuat...</div>
    </div>
  </div>`
  setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'start' }), 60)
  const html = await buildForm(id)
  document.getElementById('detail-body').innerHTML = html + `
    <div class="form-save">
      <button class="btn btn-outline btn-sm" onclick="tutupDetail()">Batal</button>
      <button class="btn btn-primary" style="padding:10px 24px;" onclick="saveFeature('${id}')">
        <i class="ti ti-device-floppy" style="font-size:15px;"></i> Simpan
      </button>
    </div>`
  if (id==='musik') loadMusikList()
  if (id==='tema')  loadTemaOptions()
  if (id==='buku')  loadBukuTamu()
  if (id==='ucapan') loadUcapan()
  if (id==='kirim') loadKirimList()
}

function tutupDetail() {
  activeFeatureId = null
  document.getElementById('feature-detail').style.display = 'none'
  renderFeatureGrid()
}

// ── BUILD FORMS ───────────────────────────────────────────────
async function buildForm(id) {
  switch(id) {
    case 'pengantin': return await formPengantin()
    case 'tema':      return `<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Pilih tema undangan Anda.</p><div id="tema-options" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">Memuat...</div>`
    case 'acara':     return await formAcara()
    case 'galeri':    return await formGaleri()
    case 'musik':     return formMusik()
    case 'ucapan':    return `<div id="ucapan-list">Memuat ucapan...</div>`
    case 'kado':      return await formKado()
    case 'rsvp':      return await formRsvp()
    case 'streaming': return await formStreaming()
    case 'story':     return await formStory()
    case 'filter':    return `<div style="font-size:13px;color:var(--text-muted);line-height:1.7;">Gunakan menu <strong>Filter IG</strong> di sidebar untuk membuat dan mendownload bingkai foto Instagram Story 1080×1920.</div>`
    case 'quote':     return await formQuote()
    case 'setting':   return await formSetting()
    case 'buku':      return formBukuTamu_html()
    case 'kirim':     return await formKirim()
    default: return ''
  }
}

async function formPengantin() {
  let p={}, w={}
  if (activeInvId) {
    const {data} = await sb.from('pengantin').select('*').eq('undangan_id',activeInvId).order('urutan')
    p = data?.find(x=>x.urutan===1)||{}
    w = data?.find(x=>x.urutan===2)||{}
  }
  return `<div style="background:var(--rose-light);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--rose-dark);">
    <i class="ti ti-info-circle"></i> Isi data mempelai pria terlebih dahulu
  </div>
  <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:10px;">MEMPELAI PRIA</div>
  <div class="form-group"><label class="form-label">Nama Lengkap</label><input class="form-input" id="pg-p-nama" value="${p.nama_lengkap||''}"></div>
  <div class="form-group"><label class="form-label">Nama Panggilan</label><input class="form-input" id="pg-p-panggilan" value="${p.nama_panggilan||''}"></div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Nama Ayah</label><input class="form-input" id="pg-p-ayah" value="${p.nama_ayah||''}"></div>
    <div class="form-group"><label class="form-label">Nama Ibu</label><input class="form-input" id="pg-p-ibu" value="${p.nama_ibu||''}"></div>
  </div>
  <div class="form-group">
    <label class="form-label">Foto Mempelai Pria</label>
    <div style="display:flex;align-items:center;gap:12px;">
      <div id="preview-p-foto" style="width:64px;height:64px;border-radius:50%;background:var(--rose-light);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:28px;">
        ${p.foto_url ? `<img src="${p.foto_url}" style="width:100%;height:100%;object-fit:cover;">` : '👨'}
      </div>
      <div style="flex:1;">
        <input type="file" id="upload-p-foto" accept="image/*" style="display:none;" onchange="uploadFoto(this,'p')">
        <button onclick="document.getElementById('upload-p-foto').click()" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;">
          <i class="ti ti-upload" style="font-size:14px;"></i> Upload Foto
        </button>
        <div id="upload-p-status" style="font-size:11px;color:var(--text-muted);margin-top:4px;">${p.foto_url?'Foto sudah diupload':'Belum ada foto'}</div>
      </div>
    </div>
    <input type="hidden" id="pg-p-foto" value="${p.foto_url||''}">
  </div>
  <div style="height:1px;background:var(--border);margin:16px 0;"></div>
  <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:10px;">MEMPELAI WANITA</div>
  <div class="form-group"><label class="form-label">Nama Lengkap</label><input class="form-input" id="pg-w-nama" value="${w.nama_lengkap||''}"></div>
  <div class="form-group"><label class="form-label">Nama Panggilan</label><input class="form-input" id="pg-w-panggilan" value="${w.nama_panggilan||''}"></div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Nama Ayah</label><input class="form-input" id="pg-w-ayah" value="${w.nama_ayah||''}"></div>
    <div class="form-group"><label class="form-label">Nama Ibu</label><input class="form-input" id="pg-w-ibu" value="${w.nama_ibu||''}"></div>
  </div>
  <div class="form-group">
    <label class="form-label">Foto Mempelai Wanita</label>
    <div style="display:flex;align-items:center;gap:12px;">
      <div id="preview-w-foto" style="width:64px;height:64px;border-radius:50%;background:var(--rose-light);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:28px;">
        ${w.foto_url ? `<img src="${w.foto_url}" style="width:100%;height:100%;object-fit:cover;">` : '👩'}
      </div>
      <div style="flex:1;">
        <input type="file" id="upload-w-foto" accept="image/*" style="display:none;" onchange="uploadFoto(this,'w')">
        <button onclick="document.getElementById('upload-w-foto').click()" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;">
          <i class="ti ti-upload" style="font-size:14px;"></i> Upload Foto
        </button>
        <div id="upload-w-status" style="font-size:11px;color:var(--text-muted);margin-top:4px;">${w.foto_url?'Foto sudah diupload':'Belum ada foto'}</div>
      </div>
    </div>
    <input type="hidden" id="pg-w-foto" value="${w.foto_url||''}">
  </div>`
}

async function uploadFoto(input, pihak) {
  const file = input.files[0]
  if (!file) return
  const maxSize = 3 * 1024 * 1024 // 3MB
  if (file.size > maxSize) return toast('Ukuran foto maksimal 3MB', 'warn')

  const statusEl = document.getElementById(`upload-${pihak}-status`)
  const previewEl = document.getElementById(`preview-${pihak}-foto`)
  if (statusEl) statusEl.textContent = 'Mengupload...'

  const ext  = file.name.split('.').pop()
  const path = `${currentUser.id}/${activeInvId}-${pihak}-${Date.now()}.${ext}`

  const { data, error } = await sb.storage
    .from('foto-pengantin')
    .upload(path, file, { upsert: true })

  if (error) {
    if (statusEl) statusEl.textContent = 'Gagal upload: ' + error.message
    return toast('Gagal upload foto', 'err')
  }

  const { data: urlData } = sb.storage.from('foto-pengantin').getPublicUrl(path)
  const publicUrl = urlData.publicUrl

  // simpan ke hidden input
  setVal(`pg-${pihak}-foto`, publicUrl)

  // update preview
  if (previewEl) previewEl.innerHTML = `<img src="${publicUrl}" style="width:100%;height:100%;object-fit:cover;">`
  if (statusEl) statusEl.textContent = '✓ Foto berhasil diupload'
  toast('Foto diupload!')
}


  const { data: temas } = await sb.from('tema').select('*').eq('aktif',true).order('urutan')
  const el = document.getElementById('tema-options')
  if (!el) return
  let aktiveTemaId = null
  if (activeInvId) {
    const {data:inv} = await sb.from('undangan').select('tema_id').eq('id',activeInvId).single()
    aktiveTemaId = inv?.tema_id
  }
  el.innerHTML = (temas||[]).map(t => `
    <div onclick="pilihTema('${t.id}',this)" id="topt-${t.id}"
      style="border:2px solid ${t.id===aktiveTemaId?'var(--rose)':'var(--border)'};border-radius:12px;overflow:hidden;cursor:pointer;transition:all .2s;">
      <div style="height:56px;background:linear-gradient(135deg,${t.warna_primer||'#C97B84'},${t.warna_sekunder||'#C9A96E'});display:flex;align-items:center;justify-content:center;">
        ${t.id===aktiveTemaId?'<i class="ti ti-check" style="font-size:22px;color:#fff;"></i>':''}
      </div>
      <div style="padding:8px 10px;">
        <div style="font-size:12px;font-weight:600;">${t.nama}</div>
        <div style="font-size:10px;color:var(--text-muted);">${t.konsep||t.kategori||''}</div>
        <span class="badge-paket-${t.paket_min}" style="margin-top:4px;display:inline-block;">${t.paket_min}</span>
      </div>
    </div>`).join('')
}

async function pilihTema(temaId, el) {
  document.querySelectorAll('[id^="topt-"]').forEach(t => { t.style.borderColor='var(--border)'; t.querySelector('div i')?.remove() })
  el.style.borderColor = 'var(--rose)'
  const div = el.querySelector('div')
  if (div && !div.querySelector('i')) { const ic=document.createElement('i'); ic.className='ti ti-check'; ic.style.cssText='font-size:22px;color:#fff;'; div.appendChild(ic) }
  if (activeInvId) { await sb.from('undangan').update({tema_id:temaId}).eq('id',activeInvId); toast('Tema disimpan') }
}

async function formAcara() {
  let a={}, r={}
  if (activeInvId) {
    const {data} = await sb.from('acara').select('*').eq('undangan_id',activeInvId).order('urutan')
    a = data?.find(x=>x.urutan===1)||{}; r = data?.find(x=>x.urutan===2)||{}
  }
  const fmt = d => d?d.split('T')[0]:''
  return `<div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:10px;">AKAD NIKAH</div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Tanggal</label><input class="form-input" type="date" id="akad-tgl" value="${fmt(a.tanggal)}"></div>
    <div class="form-group"><label class="form-label">Jam</label><input class="form-input" type="time" id="akad-jam" value="${a.jam_mulai||'09:00'}"></div>
  </div>
  <div class="form-group"><label class="form-label">Nama Tempat</label><input class="form-input" id="akad-lokasi" value="${a.lokasi_nama||''}"></div>
  <div class="form-group"><label class="form-label">Alamat</label><textarea class="form-input" rows="2" id="akad-alamat">${a.alamat||''}</textarea></div>
  <div class="form-group"><label class="form-label">Link Google Maps</label><input class="form-input" type="url" id="akad-maps" value="${a.maps_url||''}"></div>
  <div style="height:1px;background:var(--border);margin:16px 0;"></div>
  <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:10px;">RESEPSI</div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Tanggal</label><input class="form-input" type="date" id="rsp-tgl" value="${fmt(r.tanggal)}"></div>
    <div class="form-group"><label class="form-label">Jam</label><input class="form-input" type="time" id="rsp-jam" value="${r.jam_mulai||'11:00'}"></div>
  </div>
  <div class="form-group"><label class="form-label">Nama Tempat</label><input class="form-input" id="rsp-lokasi" value="${r.lokasi_nama||''}"></div>
  <div class="form-group"><label class="form-label">Alamat</label><textarea class="form-input" rows="2" id="rsp-alamat">${r.alamat||''}</textarea></div>
  <div class="form-group"><label class="form-label">Link Google Maps</label><input class="form-input" type="url" id="rsp-maps" value="${r.maps_url||''}"></div>`
}

async function formGaleri() {
  let urls = ['','','','','']
  if (activeInvId) {
    const {data} = await sb.from('galeri').select('*').eq('undangan_id',activeInvId).order('urutan')
    data?.forEach((g,i) => { if(i<5) urls[i]=g.foto_url||'' })
  }
  return `<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Upload foto ke Supabase Storage bucket <strong>galeri</strong>, lalu tempel URL di sini.</p>
  ${urls.map((u,i)=>`<div class="form-group"><label class="form-label">Foto ${i+1}</label><input class="form-input" id="galeri-${i}" type="url" placeholder="https://..." value="${u}"></div>`).join('')}`
}

function formMusik() {
  return `<div style="display:flex;gap:8px;margin-bottom:12px;">
    <button onclick="switchMusikTab('pilih',this)" style="flex:1;padding:10px;border-radius:10px;background:var(--rose);color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;" class="mtab">🎵 Pilih Lagu</button>
    <button onclick="switchMusikTab('link',this)"  style="flex:1;padding:10px;border-radius:10px;background:var(--ivory);border:1.5px solid var(--border);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;" class="mtab">🔗 URL Sendiri</button>
  </div>
  <div id="mpanel-pilih">
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;" id="musik-kat-btns">
      ${['Semua','Instrumental','Jazz','Pop Romantis','Pop Indonesia','R&B','Islami'].map((k,i)=>
        `<button onclick="filterMusikKat('${k}',this)" style="padding:5px 12px;border-radius:50px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid ${i===0?'var(--rose)':'var(--border)'};background:${i===0?'var(--rose)':'var(--ivory)'};color:${i===0?'#fff':'var(--text-muted)'};font-family:inherit;transition:all .2s;">${k}</button>`
      ).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:8px;background:var(--ivory);border:1.5px solid var(--border);border-radius:10px;padding:8px 12px;margin-bottom:10px;">
      <i class="ti ti-search" style="font-size:15px;color:var(--text-muted);"></i>
      <input oninput="cariMusik(this.value)" placeholder="Cari judul atau artis..." style="border:none;background:transparent;font-size:13px;width:100%;outline:none;font-family:inherit;">
    </div>
    <div id="musik-list-ui" style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;"></div>
    <div id="musik-terpilih-label" style="margin-top:10px;background:var(--rose-light);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--rose-dark);">
      <i class="ti ti-music"></i> Belum ada lagu dipilih
    </div>
  </div>
  <div id="mpanel-link" style="display:none;">
    <div class="form-group"><label class="form-label">URL Lagu (YouTube / SoundCloud / GDrive)</label>
    <input class="form-input" id="musik-custom-url" type="url" placeholder="https://..."></div>
  </div>`
}

async function loadMusikList() {
  const {data} = await sb.from('musik').select('*').eq('aktif',true).order('urutan')
  allMusikData = data || []
  if (activeInvId) {
    const {data:um} = await sb.from('undangan_musik').select('musik_id,musik(judul,artis)').eq('undangan_id',activeInvId).limit(1)
    if (um?.length) {
      musikTerpilihId = um[0].musik_id
      const el = document.getElementById('musik-terpilih-label')
      if (el) el.innerHTML = `<i class="ti ti-music"></i> Terpilih: <strong>${um[0].musik?.judul} — ${um[0].musik?.artis}</strong>`
    }
  }
  renderMusikList()
}

function renderMusikList() {
  const el = document.getElementById('musik-list-ui')
  if (!el) return
  const list = allMusikData.filter(m =>
    (musikKatAktif==='Semua'||m.kategori===musikKatAktif) &&
    (m.judul.toLowerCase().includes(musikSearch.toLowerCase())||(m.artis||'').toLowerCase().includes(musikSearch.toLowerCase()))
  )
  el.innerHTML = list.length ? list.map(m=>`
    <div onclick="pilihMusik('${m.id}','${m.judul}','${m.artis||''}')"
      style="padding:11px 14px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:10px;background:${musikTerpilihId===m.id?'var(--rose-light)':''};transition:background .15s;">
      <i class="ti ti-music" style="font-size:15px;color:var(--rose);flex-shrink:0;"></i>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.judul}</div>
        <div style="font-size:11px;color:var(--text-muted);">${m.artis||''} · ${m.kategori||''}</div>
      </div>
      ${musikTerpilihId===m.id?'<i class="ti ti-check" style="color:var(--rose);"></i>':''}
    </div>`).join('')
  : '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">Tidak ditemukan</div>'
}

function filterMusikKat(kat, btn) {
  musikKatAktif = kat
  document.querySelectorAll('#musik-kat-btns button').forEach(b=>{b.style.background='var(--ivory)';b.style.color='var(--text-muted)';b.style.borderColor='var(--border)'})
  btn.style.background='var(--rose)';btn.style.color='#fff';btn.style.borderColor='var(--rose)'
  renderMusikList()
}
function cariMusik(val) { musikSearch=val; renderMusikList() }
function pilihMusik(id, judul, artis) {
  musikTerpilihId=id; renderMusikList()
  const el=document.getElementById('musik-terpilih-label')
  if (el) el.innerHTML=`<i class="ti ti-music"></i> Terpilih: <strong>${judul} — ${artis}</strong>`
}
function switchMusikTab(tab) {
  document.getElementById('mpanel-pilih').style.display=tab==='pilih'?'block':'none'
  document.getElementById('mpanel-link').style.display=tab==='link'?'block':'none'
  document.querySelectorAll('.mtab').forEach((b,i)=>{const ok=(tab==='pilih'&&i===0)||(tab==='link'&&i===1);b.style.background=ok?'var(--rose)':'var(--ivory)';b.style.color=ok?'#fff':'var(--text)';b.style.border=ok?'none':'1.5px solid var(--border)'})
}

async function formKado() {
  let bank={}, ew={}
  if (activeInvId) {
    const {data} = await sb.from('kado').select('*').eq('undangan_id',activeInvId)
    bank=data?.find(k=>k.tipe==='bank')||{}; ew=data?.find(k=>k.tipe!=='bank'&&k.tipe)?data.find(k=>k.tipe!=='bank'):{}
  }
  return `<div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:10px;">REKENING BANK</div>
  <div class="form-group"><label class="form-label">Nama Bank</label><input class="form-input" id="kado-bank" placeholder="BCA / Mandiri / BNI" value="${bank.nama_bank||''}"></div>
  <div class="form-group"><label class="form-label">No. Rekening</label><input class="form-input" id="kado-rek" value="${bank.no_rekening||''}"></div>
  <div class="form-group"><label class="form-label">Atas Nama</label><input class="form-input" id="kado-an" value="${bank.atas_nama||''}"></div>
  <div style="height:1px;background:var(--border);margin:14px 0;"></div>
  <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:10px;">DOMPET DIGITAL</div>
  <div class="form-group"><label class="form-label">Platform</label>
    <select class="form-input" id="kado-ew-tipe"><option value="gopay" ${ew.tipe==='gopay'?'selected':''}>GoPay</option><option value="ovo" ${ew.tipe==='ovo'?'selected':''}>OVO</option><option value="dana" ${ew.tipe==='dana'?'selected':''}>Dana</option><option value="shopee" ${ew.tipe==='shopee'?'selected':''}>ShopeePay</option></select>
  </div>
  <div class="form-group"><label class="form-label">Nomor HP</label><input class="form-input" id="kado-ew-no" value="${ew.no_rekening||''}"></div>
  <div class="form-group"><label class="form-label">Atas Nama</label><input class="form-input" id="kado-ew-an" value="${ew.atas_nama||''}"></div>`
}

async function formRsvp() {
  const {count:hadir}=await sb.from('rsvp').select('*',{count:'exact',head:true}).eq('undangan_id',activeInvId).eq('status','hadir')
  const {count:tidak}=await sb.from('rsvp').select('*',{count:'exact',head:true}).eq('undangan_id',activeInvId).eq('status','tidak_hadir')
  const {count:belum}=await sb.from('rsvp').select('*',{count:'exact',head:true}).eq('undangan_id',activeInvId).eq('status','belum')
  return `<div class="form-group"><label class="form-label">Batas Konfirmasi</label><input class="form-input" type="date" id="rsvp-batas"></div>
  <div class="form-group"><label class="form-label">Pesan untuk Tamu</label><textarea class="form-input" rows="3" id="rsvp-pesan">Mohon konfirmasi kehadiran Anda paling lambat 7 hari sebelum acara.</textarea></div>
  <div style="display:flex;gap:8px;">
    <div style="flex:1;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid var(--border);"><div style="font-size:20px;font-weight:700;color:var(--success);">${hadir||0}</div><div style="font-size:11px;color:var(--text-muted);">Hadir</div></div>
    <div style="flex:1;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid var(--border);"><div style="font-size:20px;font-weight:700;color:var(--danger);">${tidak||0}</div><div style="font-size:11px;color:var(--text-muted);">Tidak Hadir</div></div>
    <div style="flex:1;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid var(--border);"><div style="font-size:20px;font-weight:700;color:var(--text-muted);">${belum||0}</div><div style="font-size:11px;color:var(--text-muted);">Belum</div></div>
  </div>`
}

async function formStreaming() {
  let st = {}
  if (activeInvId) { const {data}=await sb.from('streaming').select('*').eq('undangan_id',activeInvId).maybeSingle(); st=data||{} }
  return `<div class="form-group"><label class="form-label">Link YouTube Live</label><input class="form-input" type="url" id="stream-url" placeholder="https://youtube.com/live/..." value="${st.youtube_url||''}"></div>
  <div class="form-group"><label class="form-label">Catatan (opsional)</label><textarea class="form-input" rows="2" id="stream-ket" placeholder="cth: Live mulai pukul 09.00 WIB">${st.catatan||''}</textarea></div>`
}

async function formStory() {
  let kisah=[]
  if (activeInvId) { const {data}=await sb.from('kisah_cinta').select('*').eq('undangan_id',activeInvId).order('urutan'); kisah=data||[] }
  const rows = kisah.length ? kisah.map(k=>`
    <div style="background:var(--ivory);border-radius:10px;padding:12px;margin-bottom:8px;border-left:3px solid var(--rose);display:flex;align-items:flex-start;gap:10px;">
      <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--rose);">${k.tahun||'—'}</div><div style="font-size:13px;font-weight:600;">${k.judul||''}</div><div style="font-size:12px;color:var(--text-muted);">${k.cerita||''}</div></div>
      <button onclick="hapusKisah('${k.id}')" style="padding:5px 8px;border-radius:7px;background:var(--white);border:1px solid var(--border);cursor:pointer;"><i class="ti ti-trash" style="font-size:13px;color:var(--danger);"></i></button>
    </div>`).join('')
  : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">Belum ada momen</div>'
  return `<div id="kisah-list">${rows}</div>
  <div style="font-size:13px;font-weight:600;margin:12px 0 10px;">Tambah Momen</div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Tahun</label><input class="form-input" id="kisah-tahun" placeholder="2023"></div>
    <div class="form-group"><label class="form-label">Judul</label><input class="form-input" id="kisah-judul" placeholder="Pertama Bertemu"></div>
  </div>
  <div class="form-group"><label class="form-label">Cerita</label><textarea class="form-input" rows="3" id="kisah-cerita"></textarea></div>
  <button class="btn btn-outline btn-sm" style="margin-bottom:8px;" onclick="tambahKisah()"><i class="ti ti-plus"></i> Tambah</button>`
}
async function tambahKisah() {
  if (!activeInvId) return
  const {error}=await sb.from('kisah_cinta').insert({undangan_id:activeInvId,tahun:v('kisah-tahun'),judul:v('kisah-judul'),cerita:v('kisah-cerita')})
  if (error) return toast('Gagal','err')
  toast('Momen ditambahkan!'); showFeatureDetail('story','Kisah Cinta','ti ti-timeline')
}
async function hapusKisah(id) {
  await sb.from('kisah_cinta').delete().eq('id',id)
  toast('Momen dihapus'); showFeatureDetail('story','Kisah Cinta','ti ti-timeline')
}

async function formQuote() {
  let qt={}
  if (activeInvId) { const {data}=await sb.from('pengaturan_teks').select('quote_text,quote_sumber').eq('undangan_id',activeInvId).maybeSingle(); qt=data||{} }
  return `<div class="form-group"><label class="form-label">Teks Quote / Ayat</label><textarea class="form-input" rows="4" id="quote-text">${qt.quote_text||'"Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu istri-istri dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya."'}</textarea></div>
  <div class="form-group"><label class="form-label">Sumber</label><input class="form-input" id="quote-sumber" value="${qt.quote_sumber||'QS. Ar-Rum: 21'}"></div>`
}

async function formSetting() {
  let s={}
  if (activeInvId) { const {data}=await sb.from('pengaturan_teks').select('*').eq('undangan_id',activeInvId).maybeSingle(); s=data||{} }
  return `<div class="form-group"><label class="form-label">Teks Pembuka</label><input class="form-input" id="set-pembuka" value="${s.teks_pembuka||'Bismillahirrahmanirrahim'}"></div>
  <div class="form-group"><label class="form-label">Teks Undangan</label><textarea class="form-input" rows="3" id="set-undangan">${s.teks_undangan||'Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di hari bahagia kami.'}</textarea></div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Label Tombol Hadir</label><input class="form-input" id="set-hadir" value="${s.label_hadir||'Insyaallah Hadir'}"></div>
    <div class="form-group"><label class="form-label">Label Tidak Hadir</label><input class="form-input" id="set-tidak" value="${s.label_tidak_hadir||'Mohon Maaf, Tidak Hadir'}"></div>
  </div>
  <div class="form-group"><label class="form-label">Teks Penutup</label><textarea class="form-input" rows="3" id="set-penutup">${s.teks_penutup||'Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir.'}</textarea></div>`
}

function formBukuTamu_html() {
  return `<div style="display:flex;gap:8px;margin-bottom:12px;">
    <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center;" onclick="importExcel()"><i class="ti ti-file-spreadsheet"></i> Import Excel</button>
    <button class="btn btn-outline btn-sm" style="flex:1;justify-content:center;" onclick="toggleTambahTamu()"><i class="ti ti-user-plus"></i> Tambah Manual</button>
  </div>
  <div id="form-tambah-tamu" style="display:none;background:var(--ivory);border-radius:10px;padding:14px;margin-bottom:12px;">
    <div class="form-row">
      <div class="form-group" style="margin-bottom:8px;"><label class="form-label">Nama</label><input class="form-input" id="tamu-nama" placeholder="Nama tamu"></div>
      <div class="form-group" style="margin-bottom:8px;"><label class="form-label">No. HP</label><input class="form-input" id="tamu-hp" type="tel" placeholder="08xxx"></div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-outline btn-sm" onclick="toggleTambahTamu()">Batal</button>
      <button class="btn btn-primary btn-sm" onclick="simpanTamu()"><i class="ti ti-check"></i> Simpan</button>
    </div>
  </div>
  <div id="buku-tamu-ui"><div style="text-align:center;padding:16px;color:var(--text-muted);">Memuat...</div></div>`
}

async function loadBukuTamu() {
  if (!activeInvId) return
  const {data, count} = await sb.from('buku_tamu').select('*',{count:'exact'}).eq('undangan_id',activeInvId).order('created_at',{ascending:false})
  const el = document.getElementById('buku-tamu-ui')
  if (!el) return
  if (!data?.length) { el.innerHTML='<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:13px;">Belum ada tamu</div>'; return }
  el.innerHTML = `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">${count} tamu terdaftar</div>
    <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">
      <div style="display:grid;grid-template-columns:1fr 110px 56px;background:var(--ivory);padding:8px 12px;font-size:11px;font-weight:700;color:var(--text-muted);">
        <span>Nama</span><span>No. HP</span><span></span>
      </div>
      ${data.map(t=>`
      <div style="display:grid;grid-template-columns:1fr 110px 56px;padding:10px 12px;border-top:1px solid var(--border);align-items:center;">
        <span style="font-size:13px;font-weight:500;">${t.nama}</span>
        <span style="font-size:12px;color:var(--text-muted);">${t.no_hp||'—'}</span>
        <div style="display:flex;gap:4px;">
          <button class="tbl-btn del" onclick="hapusTamu('${t.id}')"><i class="ti ti-trash" style="font-size:13px;"></i></button>
        </div>
      </div>`).join('')}
    </div>`
}
function toggleTambahTamu() { const el=document.getElementById('form-tambah-tamu'); el.style.display=el.style.display==='none'?'block':'none' }
async function simpanTamu() {
  const nama=v('tamu-nama').trim(); const hp=v('tamu-hp').trim()
  if (!nama) return toast('Isi nama tamu','warn')
  await sb.from('buku_tamu').insert({undangan_id:activeInvId,nama,no_hp:hp})
  toast('Tamu ditambahkan!'); toggleTambahTamu(); loadBukuTamu(); loadStats()
}
async function hapusTamu(id) {
  await sb.from('buku_tamu').delete().eq('id',id); toast('Dihapus'); loadBukuTamu()
}
function importExcel() { toast('Fitur import Excel segera hadir','warn') }

async function formKirim() {
  const {data:tamu} = await sb.from('buku_tamu').select('nama,no_hp').eq('undangan_id',activeInvId).order('created_at',{ascending:false})
  return `<div style="background:var(--gold-light);border:1.5px solid var(--gold);border-radius:10px;padding:12px;margin-bottom:12px;font-size:12px;color:var(--gold-dark);">
    💡 Isi template pesan lalu klik <strong>Kirim WA</strong> per tamu — WhatsApp terbuka otomatis.
  </div>
  <div class="form-group"><label class="form-label">Template Pesan WA</label>
    <textarea class="form-input" rows="6" id="tmpl-wa">Assalamu'alaikum Wr. Wb.

Yth. [NAMA_TAMU]

Dengan penuh kebahagiaan, kami mengundang kehadiran Anda di pernikahan kami.

Informasi lengkap: [LINK_UNDANGAN]

Kehadiran Anda adalah kebahagiaan kami 🤍</textarea>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">[NAMA_TAMU] dan [LINK_UNDANGAN] diganti otomatis</div>
  </div>
  <div style="font-size:13px;font-weight:600;margin-bottom:8px;">${tamu?.length||0} Tamu:</div>
  <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">
    ${tamu?.length ? tamu.map(t=>`
    <div style="padding:11px 14px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div><div style="font-size:13px;font-weight:600;">${t.nama}</div><div style="font-size:11px;color:var(--text-muted);">${t.no_hp||'No HP belum diisi'}</div></div>
      ${t.no_hp?`<button onclick="kirimWA('${t.nama}','${t.no_hp}')" style="background:#25D366;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:inherit;white-space:nowrap;">
        <i class="ti ti-brand-whatsapp" style="font-size:15px;"></i>Kirim</button>`:'<span style="font-size:11px;color:var(--text-light);">Tambah HP dulu</span>'}
    </div>`).join('') : '<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:13px;">Tambahkan tamu di menu Buku Tamu dulu</div>'}
  </div>`
}

async function loadUcapan() {
  const {data} = await sb.from('rsvp').select('nama,ucapan,created_at').eq('undangan_id',activeInvId).not('ucapan','is',null).order('created_at',{ascending:false})
  const el = document.getElementById('ucapan-list')
  if (!el) return
  if (!data?.length) { el.innerHTML='<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:13px;">Belum ada ucapan</div>'; return }
  el.innerHTML = data.map(r=>`
    <div style="padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--rose-light);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--rose-dark);">${r.nama[0]}</div>
        <div><div style="font-size:13px;font-weight:600;">${r.nama}</div><div style="font-size:11px;color:var(--text-muted);">${formatDateTime(r.created_at)}</div></div>
      </div>
      <div style="font-size:13px;line-height:1.6;">${r.ucapan}</div>
    </div>`).join('')
}

async function loadKirimList() { /* sudah di-render di formKirim */ }

function kirimWA(nama, hp) {
  const slug  = activeInvId||'undangan'
  const link  = `${window.location.origin}/${slug}`
  const tmpl  = document.getElementById('tmpl-wa')
  const pesan = (tmpl?tmpl.value:'Undangan: [LINK_UNDANGAN]').replace('[NAMA_TAMU]',nama).replace('[LINK_UNDANGAN]',link)
  const no    = hp.replace(/\D/g,'')
  const waNo  = no.startsWith('0')?'62'+no.slice(1):no
  window.open(`https://wa.me/${waNo}?text=${encodeURIComponent(pesan)}`,'_blank')
}

// ── SAVE FEATURE ──────────────────────────────────────────────
async function saveFeature(id) {
  if (!activeInvId) return toast('Pilih undangan dulu','warn')
  showSpinner(true)
  try {
    switch(id) {
      case 'pengantin': await savePengantin(); break
      case 'acara':     await saveAcara(); break
      case 'galeri':    await saveGaleri(); break
      case 'musik':     await saveMusik(); break
      case 'kado':      await saveKado(); break
      case 'streaming': await saveStreaming(); break
      case 'quote':     await saveQuoteData(); break
      case 'setting':   await saveSetting(); break
      case 'rsvp':      toast('Statistik RSVP otomatis dari tamu'); break
      case 'ucapan':    toast('Ucapan otomatis dari tamu'); break
    }
    toast('Tersimpan! ✓')
    // tutup panel & scroll ke atas grid
    tutupDetail()
    setTimeout(() => {
      const grid = document.getElementById('feature-grid-wajib')
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  } catch(e) { toast('Gagal: '+e.message,'err') }
  finally { showSpinner(false) }
}

async function savePengantin() {
  const {data:ex}=await sb.from('pengantin').select('id,urutan').eq('undangan_id',activeInvId)
  const pria={undangan_id:activeInvId,urutan:1,nama_lengkap:v('pg-p-nama'),nama_panggilan:v('pg-p-panggilan'),nama_ayah:v('pg-p-ayah'),nama_ibu:v('pg-p-ibu'),foto_url:v('pg-p-foto')}
  const wanita={undangan_id:activeInvId,urutan:2,nama_lengkap:v('pg-w-nama'),nama_panggilan:v('pg-w-panggilan'),nama_ayah:v('pg-w-ayah'),nama_ibu:v('pg-w-ibu'),foto_url:v('pg-w-foto')}
  const ep=ex?.find(x=>x.urutan===1); const ew=ex?.find(x=>x.urutan===2)
  if (ep) await sb.from('pengantin').update(pria).eq('id',ep.id); else await sb.from('pengantin').insert(pria)
  if (ew) await sb.from('pengantin').update(wanita).eq('id',ew.id); else await sb.from('pengantin').insert(wanita)
  setText('kelola-title',`${v('pg-p-panggilan')||'—'} & ${v('pg-w-panggilan')||'—'}`)
  loadInvitations()
}
async function saveAcara() {
  const {data:ex}=await sb.from('acara').select('id,urutan').eq('undangan_id',activeInvId)
  const akad={undangan_id:activeInvId,urutan:1,nama:'Akad Nikah',tanggal:v('akad-tgl'),jam_mulai:v('akad-jam'),lokasi_nama:v('akad-lokasi'),alamat:v('akad-alamat'),maps_url:v('akad-maps')}
  const rsp={undangan_id:activeInvId,urutan:2,nama:'Resepsi',tanggal:v('rsp-tgl'),jam_mulai:v('rsp-jam'),lokasi_nama:v('rsp-lokasi'),alamat:v('rsp-alamat'),maps_url:v('rsp-maps')}
  const ea=ex?.find(x=>x.urutan===1); const er=ex?.find(x=>x.urutan===2)
  if (ea) await sb.from('acara').update(akad).eq('id',ea.id); else await sb.from('acara').insert(akad)
  if (er) await sb.from('acara').update(rsp).eq('id',er.id); else await sb.from('acara').insert(rsp)
}
async function saveGaleri() {
  await sb.from('galeri').delete().eq('undangan_id',activeInvId)
  const urls=[0,1,2,3,4].map(i=>v('galeri-'+i)).filter(u=>u)
  if (urls.length) await sb.from('galeri').insert(urls.map((url,i)=>({undangan_id:activeInvId,urutan:i+1,foto_url:url})))
}
async function saveMusik() {
  await sb.from('undangan_musik').delete().eq('undangan_id',activeInvId)
  const cu=v('musik-custom-url')
  if (musikTerpilihId) await sb.from('undangan_musik').insert({undangan_id:activeInvId,musik_id:musikTerpilihId})
  else if (cu) await sb.from('undangan_musik').insert({undangan_id:activeInvId,custom_url:cu})
}
async function saveKado() {
  await sb.from('kado').delete().eq('undangan_id',activeInvId)
  const rows=[]
  if (v('kado-rek')) rows.push({undangan_id:activeInvId,tipe:'bank',nama_bank:v('kado-bank'),no_rekening:v('kado-rek'),atas_nama:v('kado-an')})
  if (v('kado-ew-no')) rows.push({undangan_id:activeInvId,tipe:v('kado-ew-tipe'),no_rekening:v('kado-ew-no'),atas_nama:v('kado-ew-an')})
  if (rows.length) await sb.from('kado').insert(rows)
}
async function saveStreaming() {
  const url=v('stream-url'); const cat=v('stream-ket')
  const {data:ex}=await sb.from('streaming').select('id').eq('undangan_id',activeInvId).maybeSingle()
  if (ex) await sb.from('streaming').update({youtube_url:url,catatan:cat}).eq('undangan_id',activeInvId)
  else await sb.from('streaming').insert({undangan_id:activeInvId,youtube_url:url,catatan:cat})
}
async function saveQuoteData() {
  await sb.from('pengaturan_teks').upsert({undangan_id:activeInvId,quote_text:v('quote-text'),quote_sumber:v('quote-sumber')},{onConflict:'undangan_id'})
}
async function saveSetting() {
  await sb.from('pengaturan_teks').upsert({undangan_id:activeInvId,teks_pembuka:v('set-pembuka'),teks_undangan:v('set-undangan'),label_hadir:v('set-hadir'),label_tidak_hadir:v('set-tidak'),teks_penutup:v('set-penutup')},{onConflict:'undangan_id'})
}

// ── TRANSAKSI ─────────────────────────────────────────────────
function selectPaket(paket) {
  selectedPaket=paket
  document.querySelectorAll('.paket-card').forEach(c=>c.classList.remove('selected'))
  document.getElementById('paket-'+paket)?.classList.add('selected')
  const box=document.getElementById('payment-box')
  if (paket==='gratis') { box.style.display='none'; return }
  const harga=paket==='standar'?HARGA.standar:HARGA.premium
  setText('pay-nama-paket', paket.charAt(0).toUpperCase()+paket.slice(1))
  setText('pay-total', rupiah(harga))
  box.style.display='block'; box.scrollIntoView({behavior:'smooth'})
}

async function doPayment() {
  if (!selectedPaket||selectedPaket==='gratis') return
  if (!activeInvId) return toast('Buka undangan dari menu Undangan dulu','warn')
  const harga=selectedPaket==='standar'?HARGA.standar:HARGA.premium
  const orderId=`INV-${Date.now()}-${currentUser.id.slice(0,8)}`
  await sb.from('transaksi').insert({user_id:currentUser.id,undangan_id:activeInvId,paket:selectedPaket,nominal:harga,status:'pending',midtrans_order_id:orderId})
  toast('Transaksi dibuat. Hubungi CS untuk konfirmasi pembayaran.')
  loadRiwayatTransaksi()
}

async function loadRiwayatTransaksi() {
  if (!currentUser) return
  const {data}=await sb.from('transaksi').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false})
  const el=document.getElementById('riwayat-transaksi')
  if (!el) return
  if (!data?.length) { el.innerHTML='<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:13px;">Belum ada transaksi</div>'; return }
  el.innerHTML=data.map(t=>`
    <div style="background:var(--white);border-radius:10px;padding:14px;border:1px solid var(--border);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div><div style="font-size:13px;font-weight:600;">Paket ${t.paket.charAt(0).toUpperCase()+t.paket.slice(1)}</div><div style="font-size:12px;color:var(--text-muted);">${formatDateTime(t.created_at)}</div></div>
      <div style="text-align:right;"><div style="font-size:14px;font-weight:600;">${rupiah(t.nominal)}</div><span class="status-pill pill-${t.status==='paid'?'paid':t.status==='pending'?'pending':'failed'}">${t.status}</span></div>
    </div>`).join('')
}

// ── FILTER IG ─────────────────────────────────────────────────
const igTemplates = [
  { id:'sakura',    nama:'Sakura Story',   kat:'Floral',    paket:'gratis',  emoji:'🌸', bg:'linear-gradient(135deg,#F5A0B0,#FFD6DC)', bgC:'#FFF0F5', co:'#E8889A', ct:'#9B6B73', ny:1550, ns:80, ty:1660, ts:42, g1:790, g2:1480 },
  { id:'gold',      nama:'Gold Ornament',  kat:'Modern',    paket:'gratis',  emoji:'✨', bg:'linear-gradient(135deg,#C9A96E,#F5EDD8)', bgC:'#FEFBF3', co:'#B8860B', ct:'#7A5C2E', ny:1540, ns:76, ty:1650, ts:40, g1:780, g2:1470 },
  { id:'batik',     nama:'Batik Classic',  kat:'Adat',      paket:'standar', emoji:'🏺', bg:'linear-gradient(135deg,#8B4513,#D2691E)', bgC:'#FEF9F4', co:'#8B4513', ct:'#6B3A2A', ny:1560, ns:72, ty:1665, ts:38, g1:795, g2:1485 },
  { id:'minimalis', nama:'Minimalis Line', kat:'Modern',    paket:'gratis',  emoji:'◻',  bg:'linear-gradient(135deg,#E0D8D0,#F5F5F5)', bgC:'#FAFAFA', co:'#888888', ct:'#666666', ny:1570, ns:70, ty:1670, ts:36, g1:800, g2:1490 },
  { id:'islami',    nama:'Islami Hijau',   kat:'Islami',    paket:'gratis',  emoji:'☪',  bg:'linear-gradient(135deg,#2D6A4F,#74C69D)', bgC:'#F0FFF8', co:'#2D6A4F', ct:'#2D6A4F', ny:1550, ns:78, ty:1660, ts:40, g1:790, g2:1478 },
  { id:'tropis',    nama:'Tropical Bali',  kat:'Outdoor',   paket:'standar', emoji:'🌿', bg:'linear-gradient(135deg,#4A7A4A,#7A9E7E)', bgC:'#F5FBF5', co:'#4A7A4A', ct:'#4A7A4A', ny:1545, ns:76, ty:1655, ts:40, g1:785, g2:1472 },
]
igActiveTpl = igTemplates[0]

function loadIGTemplates() {
  const grid=document.getElementById('ig-template-grid')
  if (!grid) return
  grid.innerHTML=igTemplates.map(t=>`
    <div class="tpl-card${igActiveTpl.id===t.id?' active':''}" onclick="igPilihTemplate('${t.id}')">
      <div class="tpl-thumb" style="background:${t.bg};">${t.emoji}</div>
      <div class="tpl-info">
        <div class="tpl-name">${t.nama}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:3px;">
          <span class="tpl-cat">${t.kat}</span>
          <span class="badge-paket-${t.paket}">${t.paket}</span>
        </div>
      </div>
    </div>`).join('')
}

function igPilihTemplate(id) {
  igActiveTpl=igTemplates.find(t=>t.id===id)
  loadIGTemplates(); igRender()
}

function initIGWarna() {
  document.getElementById('ig-warna-picker')?.addEventListener('click', e=>{
    const dot=e.target.closest('.warna-dot')
    if (!dot) return
    igWarnaAktif=dot.dataset.w
    document.querySelectorAll('.warna-dot').forEach(d=>d.classList.remove('active'))
    dot.classList.add('active'); igRender()
  })
}

function setDefaultDate() {
  const el=document.getElementById('ig-tanggal')
  if (el&&!el.value) el.value=new Date().toISOString().split('T')[0]
  setTimeout(igRender,100)
}

function igRender() {
  const canvas=document.getElementById('ig-canvas')
  if (!canvas) return
  const ctx=canvas.getContext('2d')
  const W=1080, H=1920, T=igActiveTpl
  const nama=document.getElementById('ig-nama')?.value||'Nama Mempelai'
  const tgl=formatTanggal(document.getElementById('ig-tanggal')?.value||'')
  const font=document.getElementById('ig-font')?.value||'Great Vibes'
  ctx.clearRect(0,0,W,H)
  ctx.fillStyle=T.bgC; ctx.fillRect(0,0,W,H)
  ctx.strokeStyle=T.co; ctx.globalAlpha=0.15; ctx.lineWidth=3; ctx.strokeRect(28,28,W-56,H-56); ctx.globalAlpha=1
  // ornamen sudut
  ctx.font='120px serif'; ctx.fillStyle=T.co; ctx.globalAlpha=0.1
  ctx.textAlign='left';  ctx.fillText(T.emoji, 20, 140)
  ctx.textAlign='right'; ctx.fillText(T.emoji, W-20, 140)
  ctx.textAlign='left';  ctx.fillText(T.emoji, 20, H-20)
  ctx.textAlign='right'; ctx.fillText(T.emoji, W-20, H-20)
  ctx.globalAlpha=1
  // teks atas
  ctx.fillStyle=T.co; ctx.globalAlpha=0.6; ctx.font='32px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center'
  ctx.fillText('Turut mengucapkan selamat kepada', W/2, T.g1-40); ctx.globalAlpha=1
  // garis atas
  ctx.strokeStyle=T.co; ctx.globalAlpha=0.35; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(80,T.g1); ctx.lineTo(W/2-160,T.g1); ctx.stroke()
  ctx.beginPath(); ctx.arc(W/2,T.g1,5,0,Math.PI*2); ctx.fillStyle=T.co; ctx.fill()
  ctx.beginPath(); ctx.moveTo(W/2+160,T.g1); ctx.lineTo(W-80,T.g1); ctx.stroke()
  ctx.globalAlpha=1
  // nama
  ctx.fillStyle=igWarnaAktif; ctx.font=`${T.ns}px "${font}","Playfair Display",serif`; ctx.textAlign='center'
  ctx.shadowColor='rgba(0,0,0,0.08)'; ctx.shadowBlur=10; ctx.fillText(nama,W/2,T.ny); ctx.shadowBlur=0
  // tanggal
  ctx.fillStyle=T.ct; ctx.globalAlpha=0.85; ctx.font=`${T.ts}px "Plus Jakarta Sans",sans-serif`
  ctx.fillText(tgl,W/2,T.ty); ctx.globalAlpha=1
  // garis bawah
  ctx.strokeStyle=T.co; ctx.globalAlpha=0.35; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(80,T.g2); ctx.lineTo(W/2-100,T.g2); ctx.stroke()
  ctx.beginPath(); ctx.arc(W/2,T.g2,5,0,Math.PI*2); ctx.fillStyle=T.co; ctx.fill()
  ctx.beginPath(); ctx.moveTo(W/2+100,T.g2); ctx.lineTo(W-80,T.g2); ctx.stroke()
  ctx.globalAlpha=1
  // watermark
  ctx.fillStyle=T.co; ctx.globalAlpha=0.2; ctx.font='26px "Plus Jakarta Sans",sans-serif'
  ctx.fillText('invitara.id',W/2,H-50); ctx.globalAlpha=1
}

function igDownload() {
  igRender()
  const canvas=document.getElementById('ig-canvas')
  const nama=(document.getElementById('ig-nama')?.value||'filter').replace(/\s+/g,'-').toLowerCase()
  const a=document.createElement('a'); a.download=`invitara-${nama}.png`; a.href=canvas.toDataURL('image/png'); a.click()
}

document.fonts.ready.then(()=>igRender())
