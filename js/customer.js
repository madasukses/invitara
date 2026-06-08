// ============================================================
// INVITARA - customer.js (clean rewrite)
// ============================================================

var currentUser    = null
var currentProfile = null
var activeInvId    = null
var activeFeatureId = null
var selectedPaket  = null
var musikTerpilihId = null
var allMusikData   = []
var musikKatAktif  = 'Semua'
var musikSearch    = ''
var igActiveTpl    = null
var igWarnaAktif   = '#4A3728'

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  requireAuth('customer').then(function(auth) {
    if (!auth) return
    currentUser    = auth.session.user
    currentProfile = auth.profile
    initUI()
  })
})

function initUI() {
  // sidebar profile
  var el = document.getElementById('cust-name')
  if (el) el.textContent = currentProfile.nama || 'Pengguna'
  var el2 = document.getElementById('cust-email')
  if (el2) el2.textContent = currentProfile.email || ''
  var el3 = document.getElementById('cust-avatar')
  if (el3) el3.textContent = (currentProfile.nama || 'U')[0].toUpperCase()

  loadStats()
  loadInvitations()
  loadRiwayatTransaksi()
  loadIGTemplates()
  initIGWarna()
  setDefaultIGDate()
  switchMenu('dashboard')
}

// ── SIDEBAR ───────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('show')
  document.getElementById('sidebar-overlay').classList.toggle('show')
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('show')
  document.getElementById('sidebar-overlay').classList.remove('show')
}

function switchMenu(menu) {
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active') })
  var navEl = document.querySelector('[data-menu="' + menu + '"]')
  if (navEl) navEl.classList.add('active')
  document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active') })
  var sec = document.getElementById('sec-' + menu)
  if (sec) sec.classList.add('active')
  var titles = { dashboard:'Dashboard', undangan:'Undangan', 'filter-ig':'Filter Instagram', transaksi:'Upgrade Paket', cs:'Bantuan' }
  var titleEl = document.getElementById('main-title')
  if (titleEl) titleEl.textContent = titles[menu] || menu
  closeSidebar()
}

// ── STATISTIK ─────────────────────────────────────────────────
function loadStats() {
  sb.from('undangan').select('id,views').eq('user_id', currentUser.id)
    .then(function(res) {
      var invs = res.data || []
      if (!invs.length) return
      var ids   = invs.map(function(i) { return i.id })
      var views = invs.reduce(function(a, i) { return a + (i.views || 0) }, 0)
      var el = document.getElementById('stat-views')
      if (el) el.textContent = views
      var elc = document.getElementById('inv-count-badge')
      if (elc) elc.textContent = invs.length
      sb.from('buku_tamu').select('*', { count:'exact', head:true }).in('undangan_id', ids)
        .then(function(r) { var e=document.getElementById('stat-tamu'); if(e) e.textContent=r.count||0 })
      sb.from('rsvp').select('*', { count:'exact', head:true }).in('undangan_id', ids).eq('status','hadir')
        .then(function(r) { var e=document.getElementById('stat-hadir'); if(e) e.textContent=r.count||0 })
      sb.from('rsvp').select('*', { count:'exact', head:true }).in('undangan_id', ids).not('ucapan','is',null)
        .then(function(r) { var e=document.getElementById('stat-ucapan'); if(e) e.textContent=r.count||0 })
    })
}

// ── UNDANGAN LIST ─────────────────────────────────────────────
function loadInvitations() {
  var container = document.getElementById('inv-list-container')
  if (!container) return
  sb.from('undangan')
    .select('*, tema(nama,warna_primer,warna_sekunder)')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .then(function(res) {
      var invs = res.data || []
      if (!invs.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);"><i class="ti ti-heart" style="font-size:40px;color:var(--rose-light);display:block;margin-bottom:12px;"></i>Belum ada undangan.</div>'
        return
      }
      var ids = invs.map(function(i) { return i.id })
      sb.from('pengantin').select('undangan_id,nama_panggilan,urutan').in('undangan_id', ids)
        .then(function(pgRes) {
          var allPg = pgRes.data || []
          container.innerHTML = invs.map(function(inv) {
            var pg     = allPg.filter(function(p) { return p.undangan_id === inv.id })
            var pria   = (pg.find(function(p) { return p.urutan===1 }) || {}).nama_panggilan || '—'
            var wanita = (pg.find(function(p) { return p.urutan===2 }) || {}).nama_panggilan || '—'
            var nama   = (pria!=='—'&&wanita!=='—') ? pria+' & '+wanita : inv.slug||'Undangan Baru'
            var paket  = inv.paket || 'gratis'
            var temaBg = inv.tema ? 'background:linear-gradient(135deg,'+inv.tema.warna_primer+','+inv.tema.warna_sekunder+')' : ''
            var wmAktif = inv.show_watermark !== false && paket === 'gratis'
            var wmHtml = paket === 'gratis' ? (
              '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--ivory);border-radius:8px;padding:8px 12px;margin-bottom:10px;">' +
              '<div><div style="font-size:12px;font-weight:600;">Watermark</div><div style="font-size:11px;color:var(--text-muted);">Upgrade untuk hapus permanen</div></div>' +
              '<label class="toggle-switch"><input type="checkbox" '+(wmAktif?'checked':'')+' onchange="toggleWatermarkCust(\''+inv.id+'\',this.checked)"><span class="toggle-slider"></span></label>' +
              '</div>'
            ) : ''
            return '<div class="inv-card" id="invcard-'+inv.id+'">' +
              '<div class="inv-meta">' +
              '<div class="inv-thumb" style="'+temaBg+'">💑</div>' +
              '<div style="flex:1;min-width:0;">' +
              '<div class="inv-name">'+nama+'</div>' +
              '<div class="inv-date">'+( inv.tema?inv.tema.nama:'Belum pilih tema')+'</div>' +
              '<div style="display:flex;gap:6px;margin-top:4px;">' +
              '<span class="inv-status s-'+paket+'">'+paket.toUpperCase()+'</span>' +
              '<span class="status-pill '+(inv.is_published?'pill-paid':'pill-pending')+'" style="font-size:10px;">'+(inv.is_published?'Aktif':'Draft')+'</span>' +
              '</div></div></div>' +
              wmHtml +
              '<div class="inv-actions">' +
              '<div class="inv-btn" onclick="previewInv(\''+inv.slug+'\')"><i class="ti ti-eye"></i><span>Preview</span></div>' +
              '<div class="inv-btn" onclick="showKelola(\''+inv.id+'\')"><i class="ti ti-edit"></i><span>Edit</span></div>' +
              '<div class="inv-btn" onclick="shareInv(\''+inv.slug+'\')"><i class="ti ti-share"></i><span>Bagikan</span></div>' +
              '<div class="inv-btn del" onclick="konfirmasiHapus(\''+inv.id+'\',\''+nama+'\')"><i class="ti ti-trash"></i><span>Hapus</span></div>' +
              '</div></div>'
          }).join('')
        })
    })
}

function previewInv(slug) {
  if (!slug || slug === 'null') return toast('Slug undangan kosong', 'warn')
  window.open('/' + slug, '_blank')
}

function shareInv(slug) {
  var url = window.location.origin + '/' + slug
  if (navigator.share) navigator.share({ title:'Undangan', url: url })
  else { navigator.clipboard.writeText(url); toast('Link disalin!') }
}

function konfirmasiHapus(id, nama) {
  triggerHapus('Hapus undangan "' + nama + '"?', function() { hapusUndangan(id) })
}

function hapusUndangan(id) {
  showSpinner(true)
  sb.from('undangan').delete().eq('id', id).then(function() {
    showSpinner(false)
    toast('Undangan dihapus')
    if (activeInvId === id) showListUndangan()
    loadInvitations()
    loadStats()
  })
}

function toggleWatermarkCust(id, val) {
  sb.from('undangan').update({ show_watermark: val }).eq('id', id)
    .then(function() { toast(val ? 'Watermark aktif' : 'Watermark disembunyikan') })
}

function showListUndangan() {
  document.getElementById('view-list').style.display   = 'block'
  document.getElementById('view-kelola').style.display = 'none'
  activeInvId = null; activeFeatureId = null
}

function showKelola(invId) {
  document.getElementById('view-list').style.display   = 'none'
  document.getElementById('view-kelola').style.display = 'block'
  document.getElementById('feature-detail').style.display = 'none'
  activeFeatureId = null
  switchMenu('undangan')

  if (invId && invId !== 'null') {
    activeInvId = invId
    sb.from('undangan').select('*,tema(nama)').eq('id', invId).single()
      .then(function(res) {
        var inv = res.data
        if (!inv) return
        sb.from('pengantin').select('nama_panggilan,urutan').eq('undangan_id', invId)
          .then(function(pgRes) {
            var pg = pgRes.data || []
            var pria   = (pg.find(function(p){return p.urutan===1})||{}).nama_panggilan||'—'
            var wanita = (pg.find(function(p){return p.urutan===2})||{}).nama_panggilan||'—'
            var titleEl = document.getElementById('kelola-title')
            if (titleEl) titleEl.textContent = (pria!=='—'&&wanita!=='—') ? pria+' & '+wanita : 'Kelola Undangan'
            var subEl = document.getElementById('kelola-sub')
            if (subEl) subEl.textContent = (inv.tema && inv.tema.nama) || 'Belum pilih tema'
          })
        featuresOpsional.forEach(function(f) {
          featureState[f.id] = inv['fitur_'+f.id] || false
        })
        loadKelolaStats(invId, inv.views||0)
        renderFeatureGrid()
      })
  } else {
    buatUndanganBaru()
  }
}

function loadKelolaStats(invId, views) {
  var ids = [invId]
  sb.from('buku_tamu').select('*',{count:'exact',head:true}).in('undangan_id',ids)
    .then(function(r){var e=document.getElementById('k-tamu');if(e)e.textContent=r.count||0})
  sb.from('rsvp').select('*',{count:'exact',head:true}).in('undangan_id',ids).eq('status','hadir')
    .then(function(r){var e=document.getElementById('k-hadir');if(e)e.textContent=r.count||0})
  sb.from('rsvp').select('*',{count:'exact',head:true}).in('undangan_id',ids).not('ucapan','is',null)
    .then(function(r){var e=document.getElementById('k-ucapan');if(e)e.textContent=r.count||0})
  var ev=document.getElementById('k-views'); if(ev) ev.textContent=views
}

function buatUndanganBaru() {
  showSpinner(true)
  var slug = 'undangan-' + Date.now()
  sb.from('undangan').insert({ user_id: currentUser.id, slug: slug, paket: 'gratis' })
    .select().single()
    .then(function(res) {
      showSpinner(false)
      if (res.error) { toast('Gagal membuat undangan','err'); return }
      sb.from('pengaturan_teks').insert({ undangan_id: res.data.id })
      activeInvId = res.data.id
      toast('Undangan baru dibuat!')
      loadInvitations()
      renderFeatureGrid()
    })
}

// ── FEATURE GRID ──────────────────────────────────────────────
var featuresWajib = [
  { id:'pengantin', icon:'ti ti-user-heart',    label:'Pengantin',  desc:'Data mempelai' },
  { id:'tema',      icon:'ti ti-palette',        label:'Tema',       desc:'Pilih desain' },
  { id:'acara',     icon:'ti ti-calendar-event', label:'Acara',      desc:'Akad & resepsi' },
  { id:'setting',   icon:'ti ti-settings',       label:'Pengaturan', desc:'Kustomisasi teks' },
  { id:'buku',      icon:'ti ti-address-book',   label:'Buku Tamu',  desc:'Data tamu' },
  { id:'kirim',     icon:'ti ti-send',           label:'Kirim',      desc:'Kirim via WA' },
]
var featuresOpsional = [
  { id:'galeri',    icon:'ti ti-photo',         label:'Galeri',      desc:'Foto' },
  { id:'musik',     icon:'ti ti-music',         label:'Musik',       desc:'Lagu latar' },
  { id:'ucapan',    icon:'ti ti-message-heart', label:'Ucapan',      desc:'Komentar' },
  { id:'kado',      icon:'ti ti-gift',          label:'Kado',        desc:'Amplop digital' },
  { id:'rsvp',      icon:'ti ti-mail-forward',  label:'RSVP',        desc:'Konfirmasi hadir' },
  { id:'streaming', icon:'ti ti-device-tv',     label:'Streaming',   desc:'YouTube Live' },
  { id:'story',     icon:'ti ti-timeline',      label:'Kisah Cinta', desc:'Timeline' },
  { id:'filter',    icon:'ti ti-camera',        label:'Filter IG',   desc:'Bingkai foto' },
  { id:'quote',     icon:'ti ti-quote',         label:'Quote',       desc:'Kata pembuka' },
]
var featureState = {}
featuresOpsional.forEach(function(f) { featureState[f.id] = false })

function renderFeatureGrid() {
  var gw = document.getElementById('feature-grid-wajib')
  var go = document.getElementById('feature-grid-opsional')
  if (!gw || !go) return
  gw.innerHTML = featuresWajib.map(function(f) {
    return '<div class="feature-item wajib-item'+(activeFeatureId===f.id?' active-feature':'')+'" onclick="showFeatureDetail(\''+f.id+'\',\''+f.label+'\',\''+f.icon+'\')">'+
      '<i class="'+f.icon+' feat-icon-ti"></i>'+
      '<div class="feature-label">'+f.label+'</div>'+
      '<div class="feature-desc">'+f.desc+'</div></div>'
  }).join('')
  go.innerHTML = featuresOpsional.map(function(f) {
    var on = featureState[f.id]
    return '<div class="feature-item'+(activeFeatureId===f.id?' active-feature':'')+(on?'':' off-feature')+'" id="fitem-'+f.id+'">'+
      '<div class="feature-toggle-row" onclick="toggleFeature(\''+f.id+'\','+(on?'false':'true')+');event.stopPropagation()">'+
      '<label class="toggle-switch" style="pointer-events:none;">'+
      '<input type="checkbox" '+(on?'checked':'')+' readonly>'+
      '<span class="toggle-slider"></span></label></div>'+
      '<div onclick="showFeatureDetail(\''+f.id+'\',\''+f.label+'\',\''+f.icon+'\');" style="width:100%;display:flex;flex-direction:column;align-items:center;cursor:pointer;">'+
      '<i class="'+f.icon+' feat-icon-ti"></i>'+
      '<div class="feature-label">'+f.label+'</div>'+
      '<div class="feature-desc">'+f.desc+'</div></div></div>'
  }).join('')
}

function toggleFeature(id, val) {
  featureState[id] = val
  var el = document.getElementById('fitem-'+id)
  if (el) {
    el.classList.toggle('off-feature', !val)
    var cb = el.querySelector('input[type=checkbox]')
    if (cb) cb.checked = val
  }
  if (activeInvId) {
    var update = {}; update['fitur_'+id] = val
    sb.from('undangan').update(update).eq('id', activeInvId)
  }
}

function showFeatureDetail(id, label, icon) {
  activeFeatureId = id
  renderFeatureGrid()
  var panel = document.getElementById('feature-detail')
  panel.style.display = 'block'
  panel.innerHTML = '<div class="detail-panel" style="margin-top:16px;">'+
    '<div class="detail-panel-header">'+
    '<div class="detail-panel-icon"><i class="'+icon+'" style="font-size:20px;color:var(--rose);"></i></div>'+
    '<div style="flex:1;"><div class="detail-panel-title">'+label+'</div></div>'+
    '<button onclick="tutupDetail()" style="width:34px;height:34px;border-radius:9px;background:var(--ivory);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+
    '<i class="ti ti-x" style="font-size:16px;"></i></button></div>'+
    '<div class="detail-panel-body" id="detail-body"><div style="text-align:center;padding:20px;color:var(--text-muted);">Memuat...</div></div></div>'
  setTimeout(function() { panel.scrollIntoView({ behavior:'smooth', block:'start' }) }, 60)
  buildForm(id).then(function(html) {
    var body = document.getElementById('detail-body')
    if (!body) return
    body.innerHTML = html +
      '<div class="form-save">'+
      '<button class="btn btn-outline btn-sm" onclick="tutupDetail()">Batal</button>'+
      '<button class="btn btn-primary" style="padding:10px 24px;" onclick="saveFeature(\''+id+'\')">'+
      '<i class="ti ti-device-floppy" style="font-size:15px;"></i> Simpan</button></div>'
    if (id==='musik')  loadMusikList()
    if (id==='tema')   loadTemaOptions()
    if (id==='buku')   loadBukuTamu()
    if (id==='ucapan') loadUcapan()
  })
}

function tutupDetail() {
  activeFeatureId = null
  var el = document.getElementById('feature-detail')
  if (el) el.style.display = 'none'
  renderFeatureGrid()
}

// ── FORMS ─────────────────────────────────────────────────────
function buildForm(id) {
  if (id==='pengantin') return formPengantin()
  if (id==='tema')      return Promise.resolve('<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Pilih tema undangan Anda.</p><div id="tema-options" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;"><div style="text-align:center;padding:16px;color:var(--text-muted);grid-column:1/-1;">Memuat tema...</div></div>')
  if (id==='acara')     return formAcara()
  if (id==='galeri')    return formGaleri()
  if (id==='musik')     return Promise.resolve(formMusikHtml())
  if (id==='ucapan')    return Promise.resolve('<div id="ucapan-list" style="padding:4px;">Memuat...</div>')
  if (id==='kado')      return formKado()
  if (id==='rsvp')      return formRsvp()
  if (id==='streaming') return formStreaming()
  if (id==='story')     return formStory()
  if (id==='quote')     return formQuote()
  if (id==='setting')   return formSetting()
  if (id==='buku')      return Promise.resolve(formBukuHtml())
  if (id==='kirim')     return formKirim()
  if (id==='filter')    return Promise.resolve('<div style="font-size:13px;color:var(--text-muted);">Gunakan menu <strong>Filter IG</strong> di sidebar.</div>')
  return Promise.resolve('')
}

function formPengantin() {
  if (!activeInvId) return Promise.resolve('<div>Belum ada undangan aktif</div>')
  return sb.from('pengantin').select('*').eq('undangan_id', activeInvId).order('urutan')
    .then(function(res) {
      var data = res.data || []
      var p = data.find(function(x){return x.urutan===1}) || {}
      var w = data.find(function(x){return x.urutan===2}) || {}
      return '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:10px;">MEMPELAI PRIA</div>'+
        '<div class="form-group"><label class="form-label">Nama Lengkap</label><input class="form-input" id="pg-p-nama" value="'+(p.nama_lengkap||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Nama Panggilan</label><input class="form-input" id="pg-p-panggilan" value="'+(p.nama_panggilan||'')+'"></div>'+
        '<div class="form-row">'+
        '<div class="form-group"><label class="form-label">Nama Ayah</label><input class="form-input" id="pg-p-ayah" value="'+(p.nama_ayah||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Nama Ibu</label><input class="form-input" id="pg-p-ibu" value="'+(p.nama_ibu||'')+'"></div></div>'+
        '<div class="form-group"><label class="form-label">Foto</label>'+
        '<div style="display:flex;align-items:center;gap:12px;">'+
        '<div id="prev-p" style="width:60px;height:60px;border-radius:50%;background:var(--rose-light);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">'+(p.foto_url?'<img src="'+p.foto_url+'" style="width:100%;height:100%;object-fit:cover;">':'👨')+'</div>'+
        '<div><input type="file" id="up-p" accept="image/*" style="display:none;" onchange="uploadFoto(this,\'p\')">'+
        '<button onclick="document.getElementById(\'up-p\').click()" class="btn btn-outline btn-sm"><i class="ti ti-upload"></i> Upload</button>'+
        '<div id="up-p-status" style="font-size:11px;color:var(--text-muted);margin-top:3px;">'+(p.foto_url?'Sudah ada foto':'Belum ada foto')+'</div></div></div>'+
        '<input type="hidden" id="pg-p-foto" value="'+(p.foto_url||'')+'"></div>'+
        '<div style="height:1px;background:var(--border);margin:14px 0;"></div>'+
        '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:10px;">MEMPELAI WANITA</div>'+
        '<div class="form-group"><label class="form-label">Nama Lengkap</label><input class="form-input" id="pg-w-nama" value="'+(w.nama_lengkap||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Nama Panggilan</label><input class="form-input" id="pg-w-panggilan" value="'+(w.nama_panggilan||'')+'"></div>'+
        '<div class="form-row">'+
        '<div class="form-group"><label class="form-label">Nama Ayah</label><input class="form-input" id="pg-w-ayah" value="'+(w.nama_ayah||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Nama Ibu</label><input class="form-input" id="pg-w-ibu" value="'+(w.nama_ibu||'')+'"></div></div>'+
        '<div class="form-group"><label class="form-label">Foto</label>'+
        '<div style="display:flex;align-items:center;gap:12px;">'+
        '<div id="prev-w" style="width:60px;height:60px;border-radius:50%;background:var(--rose-light);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">'+(w.foto_url?'<img src="'+w.foto_url+'" style="width:100%;height:100%;object-fit:cover;">':'👩')+'</div>'+
        '<div><input type="file" id="up-w" accept="image/*" style="display:none;" onchange="uploadFoto(this,\'w\')">'+
        '<button onclick="document.getElementById(\'up-w\').click()" class="btn btn-outline btn-sm"><i class="ti ti-upload"></i> Upload</button>'+
        '<div id="up-w-status" style="font-size:11px;color:var(--text-muted);margin-top:3px;">'+(w.foto_url?'Sudah ada foto':'Belum ada foto')+'</div></div></div>'+
        '<input type="hidden" id="pg-w-foto" value="'+(w.foto_url||'')+'"></div>'
    })
}

function uploadFoto(input, pihak) {
  var file = input.files[0]
  if (!file) return
  if (file.size > 3*1024*1024) { toast('Maksimal 3MB','warn'); return }
  var statusEl = document.getElementById('up-'+pihak+'-status')
  var prevEl   = document.getElementById('prev-'+pihak)
  if (statusEl) statusEl.textContent = 'Mengupload...'
  var ext  = file.name.split('.').pop()
  var path = currentUser.id+'/'+activeInvId+'-'+pihak+'-'+Date.now()+'.'+ext
  sb.storage.from('foto-pengantin').upload(path, file, { upsert:true })
    .then(function(res) {
      if (res.error) { if(statusEl) statusEl.textContent='Gagal: '+res.error.message; toast('Gagal upload','err'); return }
      var url = sb.storage.from('foto-pengantin').getPublicUrl(path).data.publicUrl
      var hidEl = document.getElementById('pg-'+pihak+'-foto')
      if (hidEl) hidEl.value = url
      if (prevEl) prevEl.innerHTML = '<img src="'+url+'" style="width:100%;height:100%;object-fit:cover;">'
      if (statusEl) statusEl.textContent = '✓ Berhasil diupload'
      toast('Foto diupload!')
    })
}

function loadTemaOptions() {
  sb.from('tema').select('*').eq('aktif',true).order('urutan')
    .then(function(res) {
      var temas = res.data || []
      var el = document.getElementById('tema-options')
      if (!el) return
      sb.from('undangan').select('tema_id').eq('id',activeInvId).single()
        .then(function(invRes) {
          var aktiveTemaId = (invRes.data||{}).tema_id
          el.innerHTML = temas.map(function(t) {
            return '<div onclick="pilihTema(\''+t.id+'\',this)" id="topt-'+t.id+'"'+
              ' style="border:2px solid '+(t.id===aktiveTemaId?'var(--rose)':'var(--border)')+';border-radius:12px;overflow:hidden;cursor:pointer;">'+
              '<div style="height:56px;background:linear-gradient(135deg,'+t.warna_primer+','+t.warna_sekunder+');display:flex;align-items:center;justify-content:center;">'+
              (t.id===aktiveTemaId?'<i class="ti ti-check" style="font-size:22px;color:#fff;"></i>':'')+
              '</div><div style="padding:8px 10px;">'+
              '<div style="font-size:12px;font-weight:600;">'+t.nama+'</div>'+
              '<div style="font-size:10px;color:var(--text-muted);">'+(t.konsep||t.kategori||'')+'</div>'+
              '<span class="badge-paket-'+t.paket_min+'" style="margin-top:4px;display:inline-block;">'+t.paket_min+'</span>'+
              '</div></div>'
          }).join('')
        })
    })
}

function pilihTema(temaId, el) {
  document.querySelectorAll('[id^="topt-"]').forEach(function(t) { t.style.borderColor='var(--border)'; var ic=t.querySelector('.ti-check'); if(ic) ic.remove() })
  el.style.borderColor = 'var(--rose)'
  var div = el.querySelector('div')
  if (div) { var ic=document.createElement('i'); ic.className='ti ti-check'; ic.style.cssText='font-size:22px;color:#fff;'; div.appendChild(ic) }
  if (activeInvId) { sb.from('undangan').update({tema_id:temaId}).eq('id',activeInvId).then(function(){toast('Tema disimpan')}) }
}

function formAcara() {
  if (!activeInvId) return Promise.resolve('')
  return sb.from('acara').select('*').eq('undangan_id',activeInvId).order('urutan')
    .then(function(res) {
      var data = res.data || []
      var a = data.find(function(x){return x.urutan===1}) || {}
      var r = data.find(function(x){return x.urutan===2}) || {}
      var fa = a.tanggal ? a.tanggal.split('T')[0] : ''
      var fr = r.tanggal ? r.tanggal.split('T')[0] : ''
      return '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:10px;">AKAD NIKAH</div>'+
        '<div class="form-row"><div class="form-group"><label class="form-label">Tanggal</label><input class="form-input" type="date" id="akad-tgl" value="'+fa+'"></div>'+
        '<div class="form-group"><label class="form-label">Jam</label><input class="form-input" type="time" id="akad-jam" value="'+(a.jam_mulai||'09:00')+'"></div></div>'+
        '<div class="form-group"><label class="form-label">Nama Tempat</label><input class="form-input" id="akad-lokasi" value="'+(a.lokasi_nama||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Alamat</label><textarea class="form-input" rows="2" id="akad-alamat">'+(a.alamat||'')+'</textarea></div>'+
        '<div class="form-group"><label class="form-label">Link Maps</label><input class="form-input" type="url" id="akad-maps" value="'+(a.maps_url||'')+'"></div>'+
        '<div style="height:1px;background:var(--border);margin:14px 0;"></div>'+
        '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:10px;">RESEPSI</div>'+
        '<div class="form-row"><div class="form-group"><label class="form-label">Tanggal</label><input class="form-input" type="date" id="rsp-tgl" value="'+fr+'"></div>'+
        '<div class="form-group"><label class="form-label">Jam</label><input class="form-input" type="time" id="rsp-jam" value="'+(r.jam_mulai||'11:00')+'"></div></div>'+
        '<div class="form-group"><label class="form-label">Nama Tempat</label><input class="form-input" id="rsp-lokasi" value="'+(r.lokasi_nama||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Alamat</label><textarea class="form-input" rows="2" id="rsp-alamat">'+(r.alamat||'')+'</textarea></div>'+
        '<div class="form-group"><label class="form-label">Link Maps</label><input class="form-input" type="url" id="rsp-maps" value="'+(r.maps_url||'')+'"></div>'
    })
}

function formGaleri() {
  if (!activeInvId) return Promise.resolve('')
  return sb.from('galeri').select('*').eq('undangan_id',activeInvId).order('urutan')
    .then(function(res) {
      var data = res.data || []
      var urls = ['','','','','']
      data.forEach(function(g,i){ if(i<5) urls[i]=g.foto_url||'' })
      var html = '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Upload ke Supabase Storage bucket <strong>galeri</strong>, lalu tempel URL.</p>'
      urls.forEach(function(u,i){
        html += '<div class="form-group"><label class="form-label">Foto '+(i+1)+'</label><input class="form-input" id="galeri-'+i+'" type="url" placeholder="https://..." value="'+u+'"></div>'
      })
      return html
    })
}

function formMusikHtml() {
  var kats = ['Semua','Instrumental','Jazz','Pop Romantis','Pop Indonesia','R&B','Islami']
  var katBtns = kats.map(function(k,i) {
    return '<button onclick="filterMusikKat(\''+k+'\',this)" style="padding:5px 12px;border-radius:50px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid '+(i===0?'var(--rose)':'var(--border)')+';background:'+(i===0?'var(--rose)':'var(--ivory)')+';color:'+(i===0?'#fff':'var(--text-muted)')+';font-family:inherit;">'+k+'</button>'
  }).join('')
  return '<div style="display:flex;gap:8px;margin-bottom:12px;">'+
    '<button onclick="switchMusikTab(\'pilih\',this)" style="flex:1;padding:10px;border-radius:10px;background:var(--rose);color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;">🎵 Pilih Lagu</button>'+
    '<button onclick="switchMusikTab(\'link\',this)" style="flex:1;padding:10px;border-radius:10px;background:var(--ivory);border:1.5px solid var(--border);font-size:13px;cursor:pointer;font-family:inherit;">🔗 URL Sendiri</button>'+
    '</div>'+
    '<div id="mpanel-pilih">'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;" id="musik-kat-btns">'+katBtns+'</div>'+
    '<div style="display:flex;align-items:center;gap:8px;background:var(--ivory);border:1.5px solid var(--border);border-radius:10px;padding:8px 12px;margin-bottom:10px;">'+
    '<i class="ti ti-search" style="font-size:15px;color:var(--text-muted);"></i>'+
    '<input oninput="cariMusik(this.value)" placeholder="Cari..." style="border:none;background:transparent;font-size:13px;width:100%;outline:none;font-family:inherit;"></div>'+
    '<div id="musik-list-ui" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;"></div>'+
    '<div id="musik-terpilih-label" style="margin-top:10px;background:var(--rose-light);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--rose-dark);">Belum ada lagu dipilih</div>'+
    '</div>'+
    '<div id="mpanel-link" style="display:none;">'+
    '<div class="form-group"><label class="form-label">URL Lagu</label><input class="form-input" id="musik-custom-url" type="url" placeholder="https://soundcloud.com/..."></div>'+
    '</div>'
}

function loadMusikList() {
  sb.from('musik').select('*').eq('aktif',true).order('urutan')
    .then(function(res) {
      allMusikData = res.data || []
      if (activeInvId) {
        sb.from('undangan_musik').select('musik_id,musik(judul,artis)').eq('undangan_id',activeInvId).limit(1)
          .then(function(um) {
            if (um.data && um.data.length) {
              musikTerpilihId = um.data[0].musik_id
              var el = document.getElementById('musik-terpilih-label')
              if (el && um.data[0].musik) el.innerHTML = '🎵 Terpilih: <strong>'+um.data[0].musik.judul+'</strong>'
            }
            renderMusikList()
          })
      } else renderMusikList()
    })
}

function renderMusikList() {
  var el = document.getElementById('musik-list-ui')
  if (!el) return
  var list = allMusikData.filter(function(m) {
    return (musikKatAktif==='Semua'||m.kategori===musikKatAktif) &&
      (m.judul.toLowerCase().includes(musikSearch.toLowerCase())||(m.artis||'').toLowerCase().includes(musikSearch.toLowerCase()))
  })
  el.innerHTML = list.length ? list.map(function(m) {
    return '<div onclick="pilihMusik(\''+m.id+'\',\''+m.judul+'\',\''+(m.artis||'')+'\')\"'+
      ' style="padding:11px 14px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:10px;background:'+(musikTerpilihId===m.id?'var(--rose-light)':'')+';transition:background .15s;">'+
      '<i class="ti ti-music" style="font-size:15px;color:var(--rose);flex-shrink:0;"></i>'+
      '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;">'+m.judul+'</div>'+
      '<div style="font-size:11px;color:var(--text-muted);">'+(m.artis||'')+' · '+(m.kategori||'')+'</div></div>'+
      (musikTerpilihId===m.id?'<i class="ti ti-check" style="color:var(--rose);"></i>':'')+
      '</div>'
  }).join('') : '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">Tidak ditemukan</div>'
}

function filterMusikKat(kat, btn) {
  musikKatAktif = kat
  document.querySelectorAll('#musik-kat-btns button').forEach(function(b) { b.style.background='var(--ivory)'; b.style.color='var(--text-muted)'; b.style.borderColor='var(--border)' })
  btn.style.background='var(--rose)'; btn.style.color='#fff'; btn.style.borderColor='var(--rose)'
  renderMusikList()
}
function cariMusik(val) { musikSearch=val; renderMusikList() }
function pilihMusik(id, judul, artis) {
  musikTerpilihId=id; renderMusikList()
  var el=document.getElementById('musik-terpilih-label')
  if (el) el.innerHTML='🎵 Terpilih: <strong>'+judul+' — '+artis+'</strong>'
}
function switchMusikTab(tab, btn) {
  document.getElementById('mpanel-pilih').style.display=tab==='pilih'?'block':'none'
  document.getElementById('mpanel-link').style.display=tab==='link'?'block':'none'
}

function formKado() {
  if (!activeInvId) return Promise.resolve('')
  return sb.from('kado').select('*').eq('undangan_id',activeInvId)
    .then(function(res) {
      var data = res.data || []
      var bank = data.find(function(k){return k.tipe==='bank'}) || {}
      var ew   = data.find(function(k){return k.tipe!=='bank'&&k.tipe}) || {}
      return '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:10px;">REKENING BANK</div>'+
        '<div class="form-group"><label class="form-label">Nama Bank</label><input class="form-input" id="kado-bank" value="'+(bank.nama_bank||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">No. Rekening</label><input class="form-input" id="kado-rek" value="'+(bank.no_rekening||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Atas Nama</label><input class="form-input" id="kado-an" value="'+(bank.atas_nama||'')+'"></div>'+
        '<div style="height:1px;background:var(--border);margin:14px 0;"></div>'+
        '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:10px;">DOMPET DIGITAL</div>'+
        '<div class="form-group"><label class="form-label">Platform</label>'+
        '<select class="form-input" id="kado-ew-tipe"><option value="gopay"'+(ew.tipe==='gopay'?' selected':'')+'>GoPay</option><option value="ovo"'+(ew.tipe==='ovo'?' selected':'')+'>OVO</option><option value="dana"'+(ew.tipe==='dana'?' selected':'')+'>Dana</option><option value="shopee"'+(ew.tipe==='shopee'?' selected':'')+'>ShopeePay</option></select></div>'+
        '<div class="form-group"><label class="form-label">Nomor HP</label><input class="form-input" id="kado-ew-no" value="'+(ew.no_rekening||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Atas Nama</label><input class="form-input" id="kado-ew-an" value="'+(ew.atas_nama||'')+'"></div>'
    })
}

function formRsvp() {
  if (!activeInvId) return Promise.resolve('')
  return Promise.all([
    sb.from('rsvp').select('*',{count:'exact',head:true}).eq('undangan_id',activeInvId).eq('status','hadir'),
    sb.from('rsvp').select('*',{count:'exact',head:true}).eq('undangan_id',activeInvId).eq('status','tidak_hadir'),
    sb.from('rsvp').select('*',{count:'exact',head:true}).eq('undangan_id',activeInvId).eq('status','belum'),
  ]).then(function(results) {
    var h=results[0].count||0, t=results[1].count||0, b=results[2].count||0
    return '<div class="form-group"><label class="form-label">Batas Konfirmasi</label><input class="form-input" type="date" id="rsvp-batas"></div>'+
      '<div class="form-group"><label class="form-label">Pesan untuk Tamu</label><textarea class="form-input" rows="3" id="rsvp-pesan">Mohon konfirmasi kehadiran paling lambat 7 hari sebelum acara.</textarea></div>'+
      '<div style="display:flex;gap:8px;">'+
      '<div style="flex:1;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid var(--border);"><div style="font-size:20px;font-weight:700;color:var(--success);">'+h+'</div><div style="font-size:11px;color:var(--text-muted);">Hadir</div></div>'+
      '<div style="flex:1;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid var(--border);"><div style="font-size:20px;font-weight:700;color:var(--danger);">'+t+'</div><div style="font-size:11px;color:var(--text-muted);">Tidak Hadir</div></div>'+
      '<div style="flex:1;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid var(--border);"><div style="font-size:20px;font-weight:700;color:var(--text-muted);">'+b+'</div><div style="font-size:11px;color:var(--text-muted);">Belum</div></div></div>'
  })
}

function formStreaming() {
  if (!activeInvId) return Promise.resolve('')
  return sb.from('streaming').select('*').eq('undangan_id',activeInvId).maybeSingle()
    .then(function(res) {
      var st = res.data || {}
      return '<div class="form-group"><label class="form-label">Link YouTube Live</label><input class="form-input" type="url" id="stream-url" value="'+(st.youtube_url||'')+'"></div>'+
        '<div class="form-group"><label class="form-label">Catatan</label><textarea class="form-input" rows="2" id="stream-ket">'+(st.catatan||'')+'</textarea></div>'
    })
}

function formStory() {
  if (!activeInvId) return Promise.resolve('')
  return sb.from('kisah_cinta').select('*').eq('undangan_id',activeInvId).order('urutan')
    .then(function(res) {
      var kisah = res.data || []
      var rows = kisah.length ? kisah.map(function(k) {
        return '<div style="background:var(--ivory);border-radius:10px;padding:12px;margin-bottom:8px;border-left:3px solid var(--rose);display:flex;align-items:flex-start;gap:10px;">'+
          '<div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--rose);">'+(k.tahun||'—')+'</div>'+
          '<div style="font-size:13px;font-weight:600;">'+(k.judul||'')+'</div>'+
          '<div style="font-size:12px;color:var(--text-muted);">'+(k.cerita||'')+'</div></div>'+
          '<button onclick="hapusKisah(\''+k.id+'\')" style="padding:5px 8px;border-radius:7px;background:var(--white);border:1px solid var(--border);cursor:pointer;"><i class="ti ti-trash" style="font-size:13px;color:var(--danger);"></i></button></div>'
      }).join('') : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">Belum ada momen</div>'
      return '<div id="kisah-list">'+rows+'</div>'+
        '<div style="font-size:13px;font-weight:600;margin:12px 0 10px;">Tambah Momen</div>'+
        '<div class="form-row">'+
        '<div class="form-group"><label class="form-label">Tahun</label><input class="form-input" id="kisah-tahun" placeholder="2023"></div>'+
        '<div class="form-group"><label class="form-label">Judul</label><input class="form-input" id="kisah-judul"></div></div>'+
        '<div class="form-group"><label class="form-label">Cerita</label><textarea class="form-input" rows="3" id="kisah-cerita"></textarea></div>'+
        '<button class="btn btn-outline btn-sm" style="margin-bottom:8px;" onclick="tambahKisah()"><i class="ti ti-plus"></i> Tambah</button>'
    })
}
function tambahKisah() {
  if (!activeInvId) return
  var judul = document.getElementById('kisah-judul')
  if (!judul || !judul.value) { toast('Isi judul','warn'); return }
  sb.from('kisah_cinta').insert({
    undangan_id: activeInvId,
    tahun: document.getElementById('kisah-tahun').value,
    judul: judul.value,
    cerita: document.getElementById('kisah-cerita').value
  }).then(function() { toast('Momen ditambahkan!'); showFeatureDetail('story','Kisah Cinta','ti ti-timeline') })
}
function hapusKisah(id) {
  sb.from('kisah_cinta').delete().eq('id',id).then(function() { toast('Dihapus'); showFeatureDetail('story','Kisah Cinta','ti ti-timeline') })
}

function formQuote() {
  if (!activeInvId) return Promise.resolve('')
  return sb.from('pengaturan_teks').select('quote_text,quote_sumber').eq('undangan_id',activeInvId).maybeSingle()
    .then(function(res) {
      var qt = res.data || {}
      return '<div class="form-group"><label class="form-label">Teks Quote</label><textarea class="form-input" rows="4" id="quote-text">'+(qt.quote_text||'"Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu istri-istri dari jenismu sendiri."')+'</textarea></div>'+
        '<div class="form-group"><label class="form-label">Sumber</label><input class="form-input" id="quote-sumber" value="'+(qt.quote_sumber||'QS. Ar-Rum: 21')+'"></div>'
    })
}

function formSetting() {
  if (!activeInvId) return Promise.resolve('')
  return sb.from('pengaturan_teks').select('*').eq('undangan_id',activeInvId).maybeSingle()
    .then(function(res) {
      var s = res.data || {}
      return '<div class="form-group"><label class="form-label">Teks Pembuka</label><input class="form-input" id="set-pembuka" value="'+(s.teks_pembuka||'Bismillahirrahmanirrahim')+'"></div>'+
        '<div class="form-group"><label class="form-label">Teks Undangan</label><textarea class="form-input" rows="3" id="set-undangan">'+(s.teks_undangan||'Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir.')+'</textarea></div>'+
        '<div class="form-row">'+
        '<div class="form-group"><label class="form-label">Label Hadir</label><input class="form-input" id="set-hadir" value="'+(s.label_hadir||'Insyaallah Hadir')+'"></div>'+
        '<div class="form-group"><label class="form-label">Label Tidak Hadir</label><input class="form-input" id="set-tidak" value="'+(s.label_tidak_hadir||'Mohon Maaf, Tidak Hadir')+'"></div></div>'+
        '<div class="form-group"><label class="form-label">Teks Penutup</label><textarea class="form-input" rows="3" id="set-penutup">'+(s.teks_penutup||'Kehadiran Anda adalah kebahagiaan kami.')+'</textarea></div>'
    })
}

function formBukuHtml() {
  return '<div style="display:flex;gap:8px;margin-bottom:12px;">'+
    '<button class="btn btn-primary btn-sm" style="flex:1;justify-content:center;" onclick="toggleTambahTamu()"><i class="ti ti-user-plus"></i> Tambah Manual</button>'+
    '</div>'+
    '<div id="form-tambah-tamu" style="display:none;background:var(--ivory);border-radius:10px;padding:14px;margin-bottom:12px;">'+
    '<div class="form-row">'+
    '<div class="form-group" style="margin-bottom:8px;"><label class="form-label">Nama</label><input class="form-input" id="tamu-nama" placeholder="Nama tamu"></div>'+
    '<div class="form-group" style="margin-bottom:8px;"><label class="form-label">No. HP</label><input class="form-input" id="tamu-hp" type="tel" placeholder="08xxx"></div></div>'+
    '<div style="display:flex;gap:8px;">'+
    '<button class="btn btn-outline btn-sm" onclick="toggleTambahTamu()">Batal</button>'+
    '<button class="btn btn-primary btn-sm" onclick="simpanTamu()"><i class="ti ti-check"></i> Simpan</button></div></div>'+
    '<div id="buku-tamu-ui"><div style="text-align:center;padding:16px;color:var(--text-muted);">Memuat...</div></div>'
}
function loadBukuTamu() {
  if (!activeInvId) return
  sb.from('buku_tamu').select('*',{count:'exact'}).eq('undangan_id',activeInvId).order('created_at',{ascending:false})
    .then(function(res) {
      var data = res.data || []
      var el = document.getElementById('buku-tamu-ui')
      if (!el) return
      if (!data.length) { el.innerHTML='<div style="text-align:center;padding:14px;color:var(--text-muted);">Belum ada tamu</div>'; return }
      el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">'+data.length+' tamu</div>'+
        '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">'+
        data.map(function(t) {
          return '<div style="display:grid;grid-template-columns:1fr 100px 40px;padding:10px 12px;border-top:1px solid var(--border);align-items:center;">'+
            '<span style="font-size:13px;font-weight:500;">'+t.nama+'</span>'+
            '<span style="font-size:12px;color:var(--text-muted);">'+(t.no_hp||'—')+'</span>'+
            '<button class="tbl-btn del" onclick="hapusTamu(\''+t.id+'\')"><i class="ti ti-trash" style="font-size:13px;"></i></button></div>'
        }).join('')+'</div>'
    })
}
function toggleTambahTamu() { var el=document.getElementById('form-tambah-tamu'); if(el) el.style.display=el.style.display==='none'?'block':'none' }
function simpanTamu() {
  var nama=document.getElementById('tamu-nama'); var hp=document.getElementById('tamu-hp')
  if (!nama||!nama.value.trim()) { toast('Isi nama tamu','warn'); return }
  sb.from('buku_tamu').insert({undangan_id:activeInvId,nama:nama.value.trim(),no_hp:(hp?hp.value.trim():'')})
    .then(function() { toast('Tamu ditambahkan!'); toggleTambahTamu(); loadBukuTamu() })
}
function hapusTamu(id) { sb.from('buku_tamu').delete().eq('id',id).then(function(){toast('Dihapus');loadBukuTamu()}) }

function formKirim() {
  if (!activeInvId) return Promise.resolve('')
  return sb.from('buku_tamu').select('nama,no_hp').eq('undangan_id',activeInvId).order('created_at',{ascending:false})
    .then(function(res) {
      var tamu = res.data || []
      var rows = tamu.length ? tamu.map(function(t) {
        return '<div style="padding:11px 14px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;">'+
          '<div><div style="font-size:13px;font-weight:600;">'+t.nama+'</div><div style="font-size:11px;color:var(--text-muted);">'+(t.no_hp||'—')+'</div></div>'+
          (t.no_hp?'<button onclick="kirimWA(\''+t.nama+'\',\''+t.no_hp+'\')" style="background:#25D366;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;"><i class="ti ti-brand-whatsapp" style="font-size:14px;"></i> Kirim</button>':'<span style="font-size:11px;color:var(--text-light);">No HP kosong</span>')+
          '</div>'
      }).join('') : '<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:13px;">Tambah tamu di Buku Tamu dulu</div>'
      return '<div style="background:var(--gold-light);border:1.5px solid var(--gold);border-radius:10px;padding:12px;margin-bottom:12px;font-size:12px;color:var(--gold-dark);">💡 Isi template → klik Kirim WA per tamu</div>'+
        '<div class="form-group"><label class="form-label">Template Pesan WA</label>'+
        '<textarea class="form-input" rows="6" id="tmpl-wa">Assalamualaikum Wr. Wb.\n\nYth. [NAMA_TAMU]\n\nKami mengundang kehadiran Anda di pernikahan kami.\n\nInfo lengkap: [LINK_UNDANGAN]\n\nKehadiran Anda adalah kebahagiaan kami 🤍</textarea>'+
        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">[NAMA_TAMU] dan [LINK_UNDANGAN] diganti otomatis</div></div>'+
        '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">'+rows+'</div>'
    })
}
function loadUcapan() {
  sb.from('rsvp').select('nama,ucapan,created_at').eq('undangan_id',activeInvId).not('ucapan','is',null).order('created_at',{ascending:false})
    .then(function(res) {
      var el = document.getElementById('ucapan-list')
      if (!el) return
      var data = res.data || []
      if (!data.length) { el.innerHTML='<div style="text-align:center;padding:14px;color:var(--text-muted);">Belum ada ucapan</div>'; return }
      el.innerHTML = data.map(function(r) {
        return '<div style="padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;">'+
          '<div style="font-size:13px;font-weight:600;">'+r.nama+'</div>'+
          '<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">'+r.ucapan+'</div></div>'
      }).join('')
    })
}
function kirimWA(nama, hp) {
  var slug = activeInvId || 'undangan'
  var link = window.location.origin+'/'+slug
  var tmpl = document.getElementById('tmpl-wa')
  var pesan = (tmpl?tmpl.value:'').replace('[NAMA_TAMU]',nama).replace('[LINK_UNDANGAN]',link)
  var no = hp.replace(/\D/g,'')
  var waNo = no.startsWith('0')?'62'+no.slice(1):no
  window.open('https://wa.me/'+waNo+'?text='+encodeURIComponent(pesan),'_blank')
}

// ── SAVE ──────────────────────────────────────────────────────
function saveFeature(id) {
  if (!activeInvId) { toast('Pilih undangan dulu','warn'); return }
  showSpinner(true)
  var promise
  if (id==='pengantin') promise = savePengantin()
  else if (id==='acara') promise = saveAcara()
  else if (id==='galeri') promise = saveGaleri()
  else if (id==='musik') promise = saveMusik()
  else if (id==='kado') promise = saveKado()
  else if (id==='streaming') promise = saveStreaming()
  else if (id==='quote') promise = saveQuoteData()
  else if (id==='setting') promise = saveSetting()
  else { showSpinner(false); toast('Tersimpan! ✓'); tutupDetail(); return }
  promise.then(function() {
    showSpinner(false); toast('Tersimpan! ✓'); tutupDetail()
    document.getElementById('feature-grid-wajib').scrollIntoView({behavior:'smooth',block:'start'})
  }).catch(function(e) { showSpinner(false); toast('Gagal: '+(e.message||e),'err') })
}

function savePengantin() {
  return sb.from('pengantin').select('id,urutan').eq('undangan_id',activeInvId)
    .then(function(res) {
      var ex = res.data || []
      var ep = ex.find(function(x){return x.urutan===1})
      var ew = ex.find(function(x){return x.urutan===2})
      var pria   = {undangan_id:activeInvId,urutan:1,
        nama_lengkap:document.getElementById('pg-p-nama').value,
        nama_panggilan:document.getElementById('pg-p-panggilan').value,
        nama_ayah:document.getElementById('pg-p-ayah').value,
        nama_ibu:document.getElementById('pg-p-ibu').value,
        foto_url:document.getElementById('pg-p-foto').value}
      var wanita = {undangan_id:activeInvId,urutan:2,
        nama_lengkap:document.getElementById('pg-w-nama').value,
        nama_panggilan:document.getElementById('pg-w-panggilan').value,
        nama_ayah:document.getElementById('pg-w-ayah').value,
        nama_ibu:document.getElementById('pg-w-ibu').value,
        foto_url:document.getElementById('pg-w-foto').value}
      var p1 = ep ? sb.from('pengantin').update(pria).eq('id',ep.id) : sb.from('pengantin').insert(pria)
      var p2 = ew ? sb.from('pengantin').update(wanita).eq('id',ew.id) : sb.from('pengantin').insert(wanita)
      return Promise.all([p1,p2]).then(function() { loadInvitations() })
    })
}
function saveAcara() {
  return sb.from('acara').select('id,urutan').eq('undangan_id',activeInvId)
    .then(function(res) {
      var ex=res.data||[]
      var ea=ex.find(function(x){return x.urutan===1}); var er=ex.find(function(x){return x.urutan===2})
      var akad={undangan_id:activeInvId,urutan:1,nama:'Akad Nikah',
        tanggal:document.getElementById('akad-tgl').value,
        jam_mulai:document.getElementById('akad-jam').value,
        lokasi_nama:document.getElementById('akad-lokasi').value,
        alamat:document.getElementById('akad-alamat').value,
        maps_url:document.getElementById('akad-maps').value}
      var rsp={undangan_id:activeInvId,urutan:2,nama:'Resepsi',
        tanggal:document.getElementById('rsp-tgl').value,
        jam_mulai:document.getElementById('rsp-jam').value,
        lokasi_nama:document.getElementById('rsp-lokasi').value,
        alamat:document.getElementById('rsp-alamat').value,
        maps_url:document.getElementById('rsp-maps').value}
      var p1=ea?sb.from('acara').update(akad).eq('id',ea.id):sb.from('acara').insert(akad)
      var p2=er?sb.from('acara').update(rsp).eq('id',er.id):sb.from('acara').insert(rsp)
      return Promise.all([p1,p2])
    })
}
function saveGaleri() {
  return sb.from('galeri').delete().eq('undangan_id',activeInvId).then(function() {
    var urls=[]
    for(var i=0;i<5;i++){var el=document.getElementById('galeri-'+i);if(el&&el.value)urls.push({undangan_id:activeInvId,urutan:i+1,foto_url:el.value})}
    if (urls.length) return sb.from('galeri').insert(urls)
  })
}
function saveMusik() {
  return sb.from('undangan_musik').delete().eq('undangan_id',activeInvId).then(function() {
    var cu=document.getElementById('musik-custom-url')
    if (musikTerpilihId) return sb.from('undangan_musik').insert({undangan_id:activeInvId,musik_id:musikTerpilihId})
    if (cu&&cu.value) return sb.from('undangan_musik').insert({undangan_id:activeInvId,custom_url:cu.value})
  })
}
function saveKado() {
  return sb.from('kado').delete().eq('undangan_id',activeInvId).then(function() {
    var rows=[]
    var rek=document.getElementById('kado-rek'); var bank=document.getElementById('kado-bank'); var an=document.getElementById('kado-an')
    if(rek&&rek.value) rows.push({undangan_id:activeInvId,tipe:'bank',nama_bank:bank.value,no_rekening:rek.value,atas_nama:an.value})
    var ewno=document.getElementById('kado-ew-no'); var ewtipe=document.getElementById('kado-ew-tipe'); var ewan=document.getElementById('kado-ew-an')
    if(ewno&&ewno.value) rows.push({undangan_id:activeInvId,tipe:ewtipe.value,no_rekening:ewno.value,atas_nama:ewan.value})
    if(rows.length) return sb.from('kado').insert(rows)
  })
}
function saveStreaming() {
  var url=document.getElementById('stream-url'); var ket=document.getElementById('stream-ket')
  return sb.from('streaming').select('id').eq('undangan_id',activeInvId).maybeSingle()
    .then(function(res) {
      var data={youtube_url:url?url.value:'',catatan:ket?ket.value:''}
      if(res.data) return sb.from('streaming').update(data).eq('undangan_id',activeInvId)
      return sb.from('streaming').insert(Object.assign({undangan_id:activeInvId},data))
    })
}
function saveQuoteData() {
  var qt=document.getElementById('quote-text'); var qs=document.getElementById('quote-sumber')
  return sb.from('pengaturan_teks').upsert({undangan_id:activeInvId,quote_text:qt?qt.value:'',quote_sumber:qs?qs.value:''},{onConflict:'undangan_id'})
}
function saveSetting() {
  var fields={teks_pembuka:'set-pembuka',teks_undangan:'set-undangan',label_hadir:'set-hadir',label_tidak_hadir:'set-tidak',teks_penutup:'set-penutup'}
  var data={undangan_id:activeInvId}
  Object.keys(fields).forEach(function(k){var el=document.getElementById(fields[k]);if(el)data[k]=el.value})
  return sb.from('pengaturan_teks').upsert(data,{onConflict:'undangan_id'})
}

// ── TRANSAKSI ─────────────────────────────────────────────────
function selectPaket(paket) {
  selectedPaket=paket
  document.querySelectorAll('.paket-card').forEach(function(c){c.classList.remove('selected')})
  var pc=document.getElementById('paket-'+paket); if(pc) pc.classList.add('selected')
  var box=document.getElementById('payment-box')
  if(paket==='gratis'){if(box)box.style.display='none';return}
  var harga=paket==='standar'?HARGA.standar:HARGA.premium
  var pn=document.getElementById('pay-nama-paket'); if(pn) pn.textContent=paket.charAt(0).toUpperCase()+paket.slice(1)
  var pt=document.getElementById('pay-total'); if(pt) pt.textContent=rupiah(harga)
  if(box){box.style.display='block';box.scrollIntoView({behavior:'smooth'})}
}
function doPayment() {
  if(!selectedPaket||selectedPaket==='gratis') return
  if(!activeInvId) {toast('Buka undangan dari menu Undangan dulu','warn');return}
  var harga=selectedPaket==='standar'?HARGA.standar:HARGA.premium
  var orderId='INV-'+Date.now()+'-'+currentUser.id.slice(0,8)
  sb.from('transaksi').insert({user_id:currentUser.id,undangan_id:activeInvId,paket:selectedPaket,nominal:harga,status:'pending',midtrans_order_id:orderId})
    .then(function(){toast('Transaksi dibuat. Hubungi CS untuk konfirmasi.');loadRiwayatTransaksi()})
}
function loadRiwayatTransaksi() {
  if (!currentUser) return
  sb.from('transaksi').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false})
    .then(function(res) {
      var el=document.getElementById('riwayat-transaksi'); if(!el) return
      var data=res.data||[]
      if(!data.length){el.innerHTML='<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:13px;">Belum ada transaksi</div>';return}
      el.innerHTML=data.map(function(t){
        return '<div style="background:var(--white);border-radius:10px;padding:14px;border:1px solid var(--border);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;">'+
          '<div><div style="font-size:13px;font-weight:600;">Paket '+t.paket.charAt(0).toUpperCase()+t.paket.slice(1)+'</div><div style="font-size:12px;color:var(--text-muted);">'+formatDateTime(t.created_at)+'</div></div>'+
          '<div style="text-align:right;"><div style="font-size:14px;font-weight:600;">'+rupiah(t.nominal)+'</div><span class="status-pill pill-'+(t.status==='paid'?'paid':t.status==='pending'?'pending':'failed')+'">'+t.status+'</span></div></div>'
      }).join('')
    })
}

// ── FILTER IG ─────────────────────────────────────────────────
var igTemplates = [
  {id:'sakura',nama:'Sakura Story',kat:'Floral',paket:'gratis',emoji:'🌸',bg:'linear-gradient(135deg,#F5A0B0,#FFD6DC)',bgC:'#FFF0F5',co:'#E8889A',ct:'#9B6B73',ny:1550,ns:80,ty:1660,ts:42,g1:790,g2:1480},
  {id:'gold',nama:'Gold Ornament',kat:'Modern',paket:'gratis',emoji:'✨',bg:'linear-gradient(135deg,#C9A96E,#F5EDD8)',bgC:'#FEFBF3',co:'#B8860B',ct:'#7A5C2E',ny:1540,ns:76,ty:1650,ts:40,g1:780,g2:1470},
  {id:'batik',nama:'Batik Classic',kat:'Adat',paket:'standar',emoji:'🏺',bg:'linear-gradient(135deg,#8B4513,#D2691E)',bgC:'#FEF9F4',co:'#8B4513',ct:'#6B3A2A',ny:1560,ns:72,ty:1665,ts:38,g1:795,g2:1485},
  {id:'minimalis',nama:'Minimalis',kat:'Modern',paket:'gratis',emoji:'◻',bg:'linear-gradient(135deg,#E0D8D0,#F5F5F5)',bgC:'#FAFAFA',co:'#888888',ct:'#666666',ny:1570,ns:70,ty:1670,ts:36,g1:800,g2:1490},
  {id:'islami',nama:'Islami Hijau',kat:'Islami',paket:'gratis',emoji:'☪',bg:'linear-gradient(135deg,#2D6A4F,#74C69D)',bgC:'#F0FFF8',co:'#2D6A4F',ct:'#2D6A4F',ny:1550,ns:78,ty:1660,ts:40,g1:790,g2:1478},
  {id:'tropis',nama:'Tropical Bali',kat:'Outdoor',paket:'standar',emoji:'🌿',bg:'linear-gradient(135deg,#4A7A4A,#7A9E7E)',bgC:'#F5FBF5',co:'#4A7A4A',ct:'#4A7A4A',ny:1545,ns:76,ty:1655,ts:40,g1:785,g2:1472},
]
igActiveTpl = igTemplates[0]

function loadIGTemplates() {
  var grid=document.getElementById('ig-template-grid')
  if (!grid) return
  grid.innerHTML=igTemplates.map(function(t) {
    return '<div class="tpl-card'+(igActiveTpl.id===t.id?' active':'')+'" onclick="igPilihTemplate(\''+t.id+'\')">'+
      '<div class="tpl-thumb" style="background:'+t.bg+';">'+t.emoji+'</div>'+
      '<div class="tpl-info"><div class="tpl-name">'+t.nama+'</div>'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:3px;">'+
      '<span class="tpl-cat">'+t.kat+'</span>'+
      '<span class="badge-paket-'+t.paket+'">'+t.paket+'</span></div></div></div>'
  }).join('')
}
function igPilihTemplate(id) {
  igActiveTpl=igTemplates.find(function(t){return t.id===id})
  loadIGTemplates(); igRender()
}
function initIGWarna() {
  var picker=document.getElementById('ig-warna-picker')
  if (!picker) return
  picker.addEventListener('click',function(e){
    var dot=e.target.closest('.warna-dot')
    if (!dot) return
    igWarnaAktif=dot.dataset.w
    document.querySelectorAll('.warna-dot').forEach(function(d){d.classList.remove('active')})
    dot.classList.add('active'); igRender()
  })
}
function setDefaultIGDate() {
  var el=document.getElementById('ig-tanggal')
  if (el&&!el.value) el.value=new Date().toISOString().split('T')[0]
  setTimeout(igRender,200)
}
function igRender() {
  var canvas=document.getElementById('ig-canvas')
  if (!canvas) return
  var ctx=canvas.getContext('2d')
  var W=1080,H=1920,T=igActiveTpl
  var namaEl=document.getElementById('ig-nama')
  var tglEl=document.getElementById('ig-tanggal')
  var fontEl=document.getElementById('ig-font')
  var nama=namaEl?namaEl.value||'Nama Mempelai':'Nama Mempelai'
  var tglRaw=tglEl?tglEl.value:''
  var font=fontEl?fontEl.value:'Great Vibes'
  var tgl=''
  if (tglRaw) {
    var bl=['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    var parts=tglRaw.split('-'); tgl=parseInt(parts[2])+' '+bl[parseInt(parts[1])]+' '+parts[0]
  }
  ctx.clearRect(0,0,W,H)
  ctx.fillStyle=T.bgC; ctx.fillRect(0,0,W,H)
  ctx.strokeStyle=T.co; ctx.globalAlpha=0.15; ctx.lineWidth=3; ctx.strokeRect(28,28,W-56,H-56); ctx.globalAlpha=1
  ctx.font='120px serif'; ctx.fillStyle=T.co; ctx.globalAlpha=0.1
  ctx.textAlign='left';  ctx.fillText(T.emoji,20,140)
  ctx.textAlign='right'; ctx.fillText(T.emoji,W-20,140)
  ctx.textAlign='left';  ctx.fillText(T.emoji,20,H-20)
  ctx.textAlign='right'; ctx.fillText(T.emoji,W-20,H-20)
  ctx.globalAlpha=1
  ctx.fillStyle=T.co; ctx.globalAlpha=0.6; ctx.font='32px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center'
  ctx.fillText('Turut mengucapkan selamat kepada',W/2,T.g1-40); ctx.globalAlpha=1
  ctx.strokeStyle=T.co; ctx.globalAlpha=0.35; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(80,T.g1); ctx.lineTo(W/2-160,T.g1); ctx.stroke()
  ctx.beginPath(); ctx.arc(W/2,T.g1,5,0,Math.PI*2); ctx.fillStyle=T.co; ctx.fill()
  ctx.beginPath(); ctx.moveTo(W/2+160,T.g1); ctx.lineTo(W-80,T.g1); ctx.stroke()
  ctx.globalAlpha=1
  ctx.fillStyle=igWarnaAktif; ctx.font=T.ns+'px "'+font+'","Playfair Display",serif'; ctx.textAlign='center'
  ctx.shadowColor='rgba(0,0,0,0.08)'; ctx.shadowBlur=10; ctx.fillText(nama,W/2,T.ny); ctx.shadowBlur=0
  ctx.fillStyle=T.ct; ctx.globalAlpha=0.85; ctx.font=T.ts+'px "Plus Jakarta Sans",sans-serif'
  ctx.fillText(tgl,W/2,T.ty); ctx.globalAlpha=1
  ctx.strokeStyle=T.co; ctx.globalAlpha=0.35; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(80,T.g2); ctx.lineTo(W/2-100,T.g2); ctx.stroke()
  ctx.beginPath(); ctx.arc(W/2,T.g2,5,0,Math.PI*2); ctx.fillStyle=T.co; ctx.fill()
  ctx.beginPath(); ctx.moveTo(W/2+100,T.g2); ctx.lineTo(W-80,T.g2); ctx.stroke()
  ctx.globalAlpha=1
  ctx.fillStyle=T.co; ctx.globalAlpha=0.2; ctx.font='26px "Plus Jakarta Sans",sans-serif'
  ctx.fillText('invitara.id',W/2,H-50); ctx.globalAlpha=1
}
function igDownload() {
  igRender()
  var canvas=document.getElementById('ig-canvas')
  var namaEl=document.getElementById('ig-nama')
  var nama=(namaEl?namaEl.value:'filter').replace(/\s+/g,'-').toLowerCase()
  var a=document.createElement('a'); a.download='invitara-'+nama+'.png'; a.href=canvas.toDataURL('image/png'); a.click()
}
document.fonts.ready.then(function(){igRender()})
