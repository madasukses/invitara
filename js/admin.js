// ============================================================
// INVITARA — admin.js
// ============================================================
let currentUser = null, currentProfile = null
let allMusikAdmin = [], allTema = [], allFilterIG = []

window.addEventListener('DOMContentLoaded', async () => {
  const auth = await requireAuth('admin')
  if (!auth) return
  currentUser = auth.session.user; currentProfile = auth.profile
  setText('admin-name', currentProfile.nama||'Admin')
  setText('admin-email', currentProfile.email||'')
  loadStats(); loadCustomers(); loadUndangan(); loadTransaksi(); loadMusik(); loadTema(); loadFilterIG()
  const hash = window.location.hash.replace('#','')||'dashboard'
  switchMenu(hash === 'customers' || hash === 'undangan' ? 'users' : hash)
})

function toggleSidebar()  { document.getElementById('sidebar').classList.toggle('show'); document.getElementById('sidebar-overlay').classList.toggle('show') }
function closeSidebar()   { document.getElementById('sidebar').classList.remove('show'); document.getElementById('sidebar-overlay').classList.remove('show') }

function switchMenu(menu) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'))
  document.querySelector(`[data-menu="${menu}"]`)?.classList.add('active')
  document.querySelectorAll('.content-section').forEach(s=>s.classList.remove('active'))
  document.getElementById('sec-'+menu)?.classList.add('active')
  const t={dashboard:'Dashboard',users:'Users & Undangan',transaksi:'Transaksi',musik:'Kelola Musik',tema:'Kelola Tema','filter-ig':'Kelola Filter IG',pengaturan:'Pengaturan'}
  setText('main-title', t[menu]||menu); window.location.hash=menu; closeSidebar()
}

function switchUserTab(tab) {
  document.getElementById('panel-customers').style.display = tab==='customers' ? 'block' : 'none'
  document.getElementById('panel-undangan').style.display  = tab==='undangan'  ? 'block' : 'none'
  document.getElementById('utab-cust').classList.toggle('active', tab==='customers')
  document.getElementById('utab-inv').classList.toggle('active',  tab==='undangan')
  document.querySelectorAll('#utab-cust, #utab-inv').forEach(t => {
    t.style.background = t.classList.contains('active') ? 'var(--white)' : 'transparent'
    t.style.color      = t.classList.contains('active') ? 'var(--text)'  : 'var(--text-muted)'
    t.style.boxShadow  = t.classList.contains('active') ? '0 2px 8px var(--border)' : 'none'
  })
}

async function loadStats() {
  const [{count:cust},{count:inv},{data:trx}] = await Promise.all([
    sb.from('profiles').select('*',{count:'exact',head:true}).eq('role','customer'),
    sb.from('undangan').select('*',{count:'exact',head:true}),
    sb.from('transaksi').select('nominal,paket').eq('status','paid'),
  ])
  const pendapatan = trx?.reduce((a,t)=>a+t.nominal,0)||0
  setText('a-stat-cust',  cust||0); setText('a-stat-inv',   inv||0)
  setText('a-stat-trx',   trx?.length||0); setText('a-stat-rev', rupiah(pendapatan))
  setText('admin-cust-count', cust||0)
  const {data:dist} = await sb.from('undangan').select('paket')
  setText('a-dist-g', dist?.filter(d=>d.paket==='gratis').length||0)
  setText('a-dist-s', dist?.filter(d=>d.paket==='standar').length||0)
  setText('a-dist-p', dist?.filter(d=>d.paket==='premium').length||0)
  const {data:recent} = await sb.from('transaksi').select('*,profiles(nama)').order('created_at',{ascending:false}).limit(5)
  const tb = document.getElementById('a-recent-trx')
  if (tb&&recent) tb.innerHTML=recent.map(t=>`<tr><td style="font-weight:500;">${t.profiles?.nama||'—'}</td><td><span class="status-pill pill-${t.paket}">${t.paket}</span></td><td>${rupiah(t.nominal)}</td><td><span class="status-pill pill-${t.status==='paid'?'paid':t.status==='pending'?'pending':'failed'}">${t.status}</span></td></tr>`).join('')
}

async function loadCustomers() {
  const {data} = await sb.from('profiles').select('*').eq('role','customer').order('created_at',{ascending:false})
  const {data:invs} = await sb.from('undangan').select('user_id')
  const tb = document.getElementById('a-tb-cust')
  if (!tb||!data) return
  tb.innerHTML = data.map(u=>{
    const cnt = invs?.filter(i=>i.user_id===u.id).length||0
    return `<tr><td style="font-weight:500;">${u.nama||'—'}</td><td style="color:var(--text-muted);">${u.email}</td><td>${cnt}</td><td><div style="display:flex;gap:5px;"><button class="tbl-btn del" onclick="hapusUser('${u.id}','${u.nama||u.email}')"><i class="ti ti-trash" style="font-size:13px;"></i></button></div></td></tr>`
  }).join('')
}

async function loadUndangan() {
  const {data} = await sb.from('undangan').select('*,profiles(nama),tema(nama)').order('created_at',{ascending:false})
  const tb = document.getElementById('a-tb-inv')
  if (!tb||!data) return
  tb.innerHTML = data.map(inv=>`<tr>
    <td><div style="font-weight:500;">${inv.slug||'—'}</div><div style="font-size:11px;color:var(--text-muted);">${inv.profiles?.nama||'—'}</div></td>
    <td><span class="status-pill pill-${inv.paket}">${inv.paket}</span></td>
    <td>${inv.views||0}</td>
    <td>
      <label class="toggle-switch" style="display:inline-block;" title="${inv.is_published?'Nonaktifkan':'Aktifkan'}">
        <input type="checkbox" ${inv.is_published?'checked':''} onchange="togglePublish('${inv.id}',${inv.is_published})">
        <span class="toggle-slider"></span>
      </label>
    </td>
    <td>
      <label class="toggle-switch" style="display:inline-block;" title="${inv.show_watermark!==false?'Watermark aktif':'Watermark nonaktif'}">
        <input type="checkbox" ${inv.show_watermark!==false?'checked':''} onchange="toggleWatermark('${inv.id}',this.checked)">
        <span class="toggle-slider"></span>
      </label>
    </td>
    <td><div style="display:flex;gap:5px;">
      <button class="tbl-btn del" onclick="hapusUndanganAdmin('${inv.id}')"><i class="ti ti-trash" style="font-size:13px;"></i></button>
    </div></td>
  </tr>`).join('')
}

async function loadTransaksi() {
  const {data} = await sb.from('transaksi').select('*,profiles(nama)').order('created_at',{ascending:false})
  const tb = document.getElementById('a-tb-trx')
  if (!tb||!data) return
  tb.innerHTML = data.map(t=>`<tr>
    <td style="font-weight:500;">${t.profiles?.nama||'—'}</td>
    <td><span class="status-pill pill-${t.paket}">${t.paket}</span></td>
    <td>${rupiah(t.nominal)}</td>
    <td><span class="status-pill pill-${t.status==='paid'?'paid':t.status==='pending'?'pending':'failed'}">${t.status}</span>
      ${t.status==='pending'?`<button onclick="konfirmasiPembayaran('${t.id}')" style="margin-left:6px;padding:3px 10px;border-radius:50px;background:var(--success);color:#fff;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">Konfirmasi</button>`:''}
    </td>
    <td>${formatDateTime(t.created_at)}</td>
  </tr>`).join('')
}

async function loadMusik() {
  const {data} = await sb.from('musik').select('*').order('urutan')
  allMusikAdmin = data||[]
  renderMusikTable(data)
}
function renderMusikTable(data) {
  const tb=document.getElementById('a-tb-musik')
  if (!tb) return
  setText('musik-count-label', `${data?.length||0} lagu`)
  tb.innerHTML = (data||[]).map(m=>`<tr>
    <td style="font-weight:500;">${m.judul}</td><td style="color:var(--text-muted);">${m.artis||'—'}</td>
    <td>${m.kategori||'—'}</td><td><span class="status-pill pill-${m.paket_min}">${m.paket_min}</span></td>
    <td><label class="toggle-switch" style="display:inline-block;"><input type="checkbox" ${m.aktif?'checked':''} onchange="toggleMusikAktif('${m.id}',this.checked)"><span class="toggle-slider"></span></label></td>
    <td><div style="display:flex;gap:5px;">
      <button class="tbl-btn" onclick="openMusikModal('${m.id}')"><i class="ti ti-edit" style="font-size:13px;"></i></button>
      <button class="tbl-btn del" onclick="hapusMusik('${m.id}','${m.judul}')"><i class="ti ti-trash" style="font-size:13px;"></i></button>
    </div></td>
  </tr>`).join('')
}
function filterMusikKat(kat,btn) {
  document.querySelectorAll('.kat-btn-admin').forEach(b=>b.classList.remove('active')); btn.classList.add('active')
  renderMusikTable(kat==='semua'?allMusikAdmin:allMusikAdmin.filter(m=>m.kategori===kat))
}

async function loadTema() {
  const {data} = await sb.from('tema').select('*').order('urutan')
  allTema=data||[]
  renderTemaGrid(data)
}
function renderTemaGrid(data) {
  const grid=document.getElementById('a-tema-grid')
  if (!grid) return
  grid.innerHTML=(data||[]).map(t=>`
    <div style="background:var(--white);border-radius:14px;overflow:hidden;border:1px solid var(--border);">
      <div style="height:60px;background:linear-gradient(135deg,${t.warna_primer||'#C97B84'},${t.warna_sekunder||'#C9A96E'});"></div>
      <div style="padding:14px;">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${t.nama}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${t.konsep||t.kategori||'—'}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
          <span class="status-pill pill-${t.paket_min}">${t.paket_min}</span>
          <span style="font-size:11px;background:var(--ivory);padding:2px 8px;border-radius:50px;color:var(--text-muted);">${t.kategori||'—'}</span>
        </div>
        <div style="display:flex;gap:5px;">
          <button class="tbl-btn" style="flex:1;width:auto;padding:6px;" onclick="openTemaModal('${t.id}')"><i class="ti ti-edit" style="font-size:14px;"></i></button>
          <button class="tbl-btn" style="flex:1;width:auto;padding:6px;" title="Lihat template" onclick="window.open('templates/${t.file_template||''}','_blank')"><i class="ti ti-eye" style="font-size:14px;"></i></button>
          <button class="tbl-btn del" style="flex:1;width:auto;padding:6px;" onclick="hapusTema('${t.id}','${t.nama}')"><i class="ti ti-trash" style="font-size:14px;"></i></button>
        </div>
      </div>
    </div>`).join('') || '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">Tidak ditemukan</div>'
}

async function loadFilterIG() {
  const {data} = await sb.from('filter_ig').select('*').order('urutan')
  allFilterIG=data||[]
  const grid=document.getElementById('a-filter-grid')
  if (!grid) return
  grid.innerHTML=(data||[]).map(f=>`
    <div style="background:var(--white);border-radius:14px;overflow:hidden;border:1px solid var(--border);">
      <div style="height:60px;background:var(--ivory);display:flex;align-items:center;justify-content:center;font-size:28px;">🖼️</div>
      <div style="padding:14px;">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${f.nama}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
          <span class="status-pill pill-${f.paket_min}">${f.paket_min}</span>
          <span style="font-size:11px;background:var(--ivory);padding:2px 8px;border-radius:50px;color:var(--text-muted);">${f.kategori||'—'}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">namaY:${f.nama_y} · tglY:${f.tanggal_y}</div>
        <div style="display:flex;gap:5px;">
          <button class="tbl-btn" style="flex:1;width:auto;padding:6px;" onclick="openFilterModal('${f.id}')"><i class="ti ti-edit" style="font-size:14px;"></i></button>
          <button class="tbl-btn del" style="flex:1;width:auto;padding:6px;" onclick="hapusFilterIG('${f.id}','${f.nama}')"><i class="ti ti-trash" style="font-size:14px;"></i></button>
        </div>
      </div>
    </div>`).join('')
}

// ── CRUD MUSIK ────────────────────────────────────────────────
function openMusikModal(id) {
  clearForm(['m-id','m-judul','m-artis','m-url'])
  setText('m-modal-title', id?'Edit Lagu':'Tambah Lagu')
  if (id) {
    const m=allMusikAdmin.find(x=>x.id===id)
    if (m) { setVal('m-id',m.id);setVal('m-judul',m.judul);setVal('m-artis',m.artis||'');setVal('m-url',m.url||'');setVal('m-kat',m.kategori||'Instrumental');setVal('m-paket',m.paket_min);setVal('m-source',m.source||'soundcloud') }
  }
  openModal('modal-musik')
}
async function saveMusikAdmin() {
  const id=v('m-id')
  const payload={judul:v('m-judul'),artis:v('m-artis'),kategori:v('m-kat'),paket_min:v('m-paket'),source:v('m-source'),url:v('m-url'),aktif:true}
  if (!payload.judul) return toast('Isi judul lagu','warn')
  showSpinner(true)
  if (id) await sb.from('musik').update(payload).eq('id',id); else await sb.from('musik').insert(payload)
  showSpinner(false); closeModal('modal-musik'); toast(id?'Diperbarui':'Ditambahkan'); loadMusik()
}
async function toggleMusikAktif(id,val) { await sb.from('musik').update({aktif:val}).eq('id',id); toast(val?'Diaktifkan':'Dinonaktifkan'); loadMusik() }
function hapusMusik(id,nama) { triggerHapus(`Hapus lagu "${nama}"?`,async()=>{await sb.from('musik').delete().eq('id',id);loadMusik()}) }

// ── CRUD TEMA ─────────────────────────────────────────────────
function openTemaModal(id) {
  clearForm(['t-id','t-nama','t-konsep','t-thumbnail','t-preview','t-template'])
  setText('t-modal-title', id?'Edit Tema':'Tambah Tema')
  if (id) {
    const t=allTema.find(x=>x.id===id)
    if (t) { setVal('t-id',t.id);setVal('t-nama',t.nama);setVal('t-konsep',t.konsep||'');setVal('t-kat',t.kategori||'Modern');setVal('t-paket',t.paket_min);setVal('t-urutan',t.urutan||1);setVal('t-wp',t.warna_primer||'#C97B84');setVal('t-ws',t.warna_sekunder||'#C9A96E');setVal('t-wb',t.warna_bg||'#FAF7F2');setVal('t-wt',t.warna_teks||'#2C2420');setVal('t-fj',t.font_judul||'Playfair Display');setVal('t-fb',t.font_body||'Plus Jakarta Sans');setVal('t-thumbnail',t.thumbnail_url||'');setVal('t-preview',t.preview_url||'');setVal('t-template',t.file_template||'') }
  }
  openModal('modal-tema')
}
async function saveTemaAdmin() {
  const id=v('t-id')
  const payload={nama:v('t-nama'),konsep:v('t-konsep'),kategori:v('t-kat'),paket_min:v('t-paket'),urutan:parseInt(v('t-urutan'))||1,warna_primer:v('t-wp'),warna_sekunder:v('t-ws'),warna_bg:v('t-wb'),warna_teks:v('t-wt'),font_judul:v('t-fj'),font_body:v('t-fb'),thumbnail_url:v('t-thumbnail'),preview_url:v('t-preview'),file_template:v('t-template'),aktif:true}
  if (!payload.nama) return toast('Isi nama tema','warn')
  showSpinner(true)
  if (id) await sb.from('tema').update(payload).eq('id',id); else await sb.from('tema').insert(payload)
  showSpinner(false); closeModal('modal-tema'); toast(id?'Diperbarui':'Ditambahkan'); loadTema()
}
function hapusTema(id,nama) { triggerHapus(`Hapus tema "${nama}"?`,async()=>{await sb.from('tema').delete().eq('id',id);loadTema()}) }

// ── CRUD FILTER IG ────────────────────────────────────────────
function openFilterModal(id) {
  clearForm(['f-id','f-nama','f-tpl-url','f-thumb-url'])
  setText('f-modal-title', id?'Edit Filter IG':'Tambah Filter IG')
  if (id) {
    const f=allFilterIG.find(x=>x.id===id)
    if (f) { setVal('f-id',f.id);setVal('f-nama',f.nama);setVal('f-kat',f.kategori||'Floral');setVal('f-paket',f.paket_min);setVal('f-urutan',f.urutan||1);setVal('f-tpl-url',f.template_url||'');setVal('f-thumb-url',f.thumbnail_url||'');setVal('f-ny',f.nama_y||1550);setVal('f-ns',f.nama_font_size||80);setVal('f-ty',f.tanggal_y||1660);setVal('f-ts',f.tanggal_font_size||42) }
  }
  openModal('modal-filter-ig')
}
async function saveFilterIGAdmin() {
  const id=v('f-id')
  const payload={nama:v('f-nama'),kategori:v('f-kat'),paket_min:v('f-paket'),urutan:parseInt(v('f-urutan'))||1,template_url:v('f-tpl-url'),thumbnail_url:v('f-thumb-url'),nama_y:parseInt(v('f-ny'))||1550,nama_font_size:parseInt(v('f-ns'))||80,tanggal_y:parseInt(v('f-ty'))||1660,tanggal_font_size:parseInt(v('f-ts'))||42,aktif:true}
  if (!payload.nama) return toast('Isi nama template','warn')
  showSpinner(true)
  if (id) await sb.from('filter_ig').update(payload).eq('id',id); else await sb.from('filter_ig').insert(payload)
  showSpinner(false); closeModal('modal-filter-ig'); toast(id?'Diperbarui':'Ditambahkan'); loadFilterIG()
}
function hapusFilterIG(id,nama) { triggerHapus(`Hapus filter "${nama}"?`,async()=>{await sb.from('filter_ig').delete().eq('id',id);loadFilterIG()}) }

// ── AKSI LAIN ─────────────────────────────────────────────────
async function togglePublish(id,current) { await sb.from('undangan').update({is_published:!current}).eq('id',id); toast(current?'Dinonaktifkan':'Diaktifkan'); loadUndangan() }
async function toggleWatermark(id,val) { await sb.from('undangan').update({show_watermark:val}).eq('id',id); toast(val?'Watermark diaktifkan':'Watermark dinonaktifkan') }
function hapusUndanganAdmin(id) { triggerHapus('Hapus undangan ini?',async()=>{await sb.from('undangan').delete().eq('id',id);loadUndangan();loadStats()}) }
function hapusUser(id,nama) { triggerHapus(`Hapus user "${nama}"?`,async()=>{await sb.from('profiles').delete().eq('id',id);loadCustomers();loadStats()}) }
async function konfirmasiPembayaran(id) { await sb.from('transaksi').update({status:'paid',paid_at:new Date().toISOString()}).eq('id',id); toast('Pembayaran dikonfirmasi'); loadTransaksi(); loadStats() }
function savePengaturan() { toast('Tersimpan! (sambungkan ke tabel pengaturan_sistem sesuai kebutuhan)') }

// ── SEARCH ADMIN ──────────────────────────────────────────────
let musikSearchVal = '', temaSearchVal = ''
function searchMusikAdmin(val) {
  musikSearchVal = val.toLowerCase()
  const filtered = allMusikAdmin.filter(m =>
    m.judul.toLowerCase().includes(musikSearchVal) ||
    (m.artis||'').toLowerCase().includes(musikSearchVal)
  )
  renderMusikTable(filtered)
}
function searchTemaAdmin(val) {
  temaSearchVal = val.toLowerCase()
  const filtered = allTema.filter(t =>
    t.nama.toLowerCase().includes(temaSearchVal) ||
    (t.konsep||'').toLowerCase().includes(temaSearchVal) ||
    (t.kategori||'').toLowerCase().includes(temaSearchVal)
  )
  renderTemaGrid(filtered)
}

// ── EXPORT / IMPORT MUSIK ─────────────────────────────────────
function exportMusik() {
  const exportData = allMusikAdmin.map(({id,created_at,...rest}) => rest)
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {type:'application/json'})
  const a = document.createElement('a'); a.download = 'invitara-musik.json'; a.href = URL.createObjectURL(blob); a.click()
  toast('Export berhasil!')
}
async function importMusik(input) {
  const file = input.files[0]; if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!Array.isArray(data)) return toast('Format JSON tidak valid', 'err')
    showSpinner(true)
    const { error } = await sb.from('musik').insert(data.map(m => ({...m, aktif: m.aktif ?? true})))
    showSpinner(false)
    if (error) return toast('Gagal import: ' + error.message, 'err')
    toast(`${data.length} lagu berhasil diimport!`)
    loadMusik()
  } catch(e) { toast('File tidak valid', 'err') }
  input.value = ''
}

// ── EXPORT / IMPORT TEMA ──────────────────────────────────────
function exportTema() {
  const exportData = allTema.map(({id,created_at,updated_at,...rest}) => rest)
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {type:'application/json'})
  const a = document.createElement('a'); a.download = 'invitara-tema.json'; a.href = URL.createObjectURL(blob); a.click()
  toast('Export berhasil!')
}
async function importTema(input) {
  const file = input.files[0]; if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!Array.isArray(data)) return toast('Format JSON tidak valid', 'err')
    showSpinner(true)
    const { error } = await sb.from('tema').insert(data.map(t => ({...t, aktif: t.aktif ?? true})))
    showSpinner(false)
    if (error) return toast('Gagal import: ' + error.message, 'err')
    toast(`${data.length} tema berhasil diimport!`)
    loadTema()
  } catch(e) { toast('File tidak valid', 'err') }
  input.value = ''
}
