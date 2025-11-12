/* Full panel with CSS-waves background and Gmail required (updated: procedure saved) */
const DB_NAME = 'sorriso_real_csswaves_v2';
const DB_VERSION = 1;
const STORE_CLINIC = 'clinic', STORE_PATIENTS='patients', STORE_APPTS='appointments', STORE_ATTS='attendances';

function openDB(){ return new Promise((res,rej)=>{ const r=indexedDB.open(DB_NAME,DB_VERSION); r.onupgradeneeded=e=>{ const db=e.target.result; if(!db.objectStoreNames.contains(STORE_CLINIC)) db.createObjectStore(STORE_CLINIC,{keyPath:'id'}); if(!db.objectStoreNames.contains(STORE_PATIENTS)) db.createObjectStore(STORE_PATIENTS,{keyPath:'id'}); if(!db.objectStoreNames.contains(STORE_APPTS)) db.createObjectStore(STORE_APPTS,{keyPath:'id'}); if(!db.objectStoreNames.contains(STORE_ATTS)) db.createObjectStore(STORE_ATTS,{keyPath:'id'}); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function tx(store,mode='readonly'){ return openDB().then(db=>db.transaction(store,mode).objectStore(store)); }

/* Clinic */
async function getClinic(){ const s=await tx(STORE_CLINIC); return new Promise(res=>{ const r=s.get('default'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }); }
async function saveClinic(data){ const s=await tx(STORE_CLINIC,'readwrite'); return new Promise((res,rej)=>{ const r=s.put(Object.assign({id:'default'},data)); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }

/* Patients */
async function addPatient(p){ const s=await tx(STORE_PATIENTS,'readwrite'); p.id='p_'+Date.now(); return new Promise((res,rej)=>{ const r=s.add(p); r.onsuccess=()=>res(p); r.onerror=()=>rej(r.error); }); }
async function updatePatient(p){ const s=await tx(STORE_PATIENTS,'readwrite'); return new Promise((res,rej)=>{ const r=s.put(p); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function listPatients(){ const s=await tx(STORE_PATIENTS); return new Promise(res=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>res([]); }); }
async function getPatient(id){ const s=await tx(STORE_PATIENTS); return new Promise(res=>{ const r=s.get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }); }
async function deletePatient(id){ const s=await tx(STORE_PATIENTS,'readwrite'); return new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }

/* Appointments (now include service/procedure) */
async function addAppt(a){ const s=await tx(STORE_APPTS,'readwrite'); a.id='a_'+Date.now(); a.created=new Date().toISOString(); return new Promise((res,rej)=>{ const r=s.add(a); r.onsuccess=()=>res(a); r.onerror=()=>rej(r.error); }); }
async function listAppts(){ const s=await tx(STORE_APPTS); return new Promise(res=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>res([]); }); }
async function getAppt(id){ const s=await tx(STORE_APPTS); return new Promise(res=>{ const r=s.get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }); }
async function deleteAppt(id){ const s=await tx(STORE_APPTS,'readwrite'); return new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }

/* Attendances */
async function addAttendance(att){ const s=await tx(STORE_ATTS,'readwrite'); att.id='att_'+Date.now(); att.startedAt=new Date().toISOString(); return new Promise((res,rej)=>{ const r=s.add(att); r.onsuccess=()=>res(att); r.onerror=()=>rej(r.error); }); }
async function listAtts(){ const s=await tx(STORE_ATTS); return new Promise(res=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>res([]); }); }
async function finishAttendance(id){ const s=await tx(STORE_ATTS,'readwrite'); return new Promise((res,rej)=>{ const r=s.get(id); r.onsuccess=()=>{ const rec=r.result; if(rec){ rec.finishedAt=new Date().toISOString(); s.put(rec).onsuccess = ()=>res(rec); } else res(null); }; r.onerror=()=>rej(r.error); }); }

/* UI */
const loadingEl = document.getElementById('loading');
function hideLoading(ms=700){ return new Promise(r=> setTimeout(()=>{ loadingEl.style.opacity=0; setTimeout(()=>loadingEl.style.display='none',200); r(); }, ms)); }

async function init(){
  await hideLoading(400);
  const c = await getClinic();
  if(!c) await saveClinic({ name:'Clínica Sorriso Real', tag:'O toque de realeza que o seu sorriso merece.' });
  bindUI();
  renderAll();
}

/* Navigation & UI binding */
function bindUI(){
  document.querySelectorAll('.menu-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tgt = btn.dataset.target;
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      document.getElementById(tgt).classList.add('active');
      document.getElementById('page-title').textContent = btn.textContent.trim();
      closeSidebarMobile();
    });
  });

  // sidebar mobile open/close
  const openBtn = document.getElementById('menuOpen');
  const closeBtn = document.getElementById('menuClose');
  if(openBtn) openBtn.addEventListener('click', openSidebarMobile);
  if(closeBtn) closeBtn.addEventListener('click', closeSidebarMobile);

  // top actions
  document.getElementById('newPatientBtn').addEventListener('click', ()=> openPatientModal());
  document.getElementById('newApptBtn').addEventListener('click', ()=> openApptModal());

  // export/import
  document.getElementById('exportBtn').addEventListener('click', exportJSON);
  document.getElementById('importFile').addEventListener('change', importJSON);

  // clinic save/reset
  document.getElementById('saveClinic').addEventListener('click', async ()=>{ const n=document.getElementById('clinicName').value.trim(); const t=document.getElementById('clinicTag').value.trim(); await saveClinic({ name:n||'Clínica Sorriso Real', tag:t||'O toque de realeza que o seu sorriso merece.' }); alert('Clínica salva.'); renderClinic(); });
  document.getElementById('resetDB').addEventListener('click', async ()=>{ if(confirm('Apagar todos os dados?')){ const db = await openDB(); db.close(); indexedDB.deleteDatabase(DB_NAME); alert('Banco apagado. Recarregue a página.'); } });

  // search & filters
  document.getElementById('searchPatient').addEventListener('input', renderPatients);
  document.getElementById('filterName').addEventListener('input', renderAppts);
  document.getElementById('filterService').addEventListener('change', renderAppts);
  document.getElementById('clearFilters').addEventListener('click', ()=>{ document.getElementById('filterName').value=''; document.getElementById('filterService').value=''; renderAppts(); });

  // attend buttons
  document.getElementById('start-att').addEventListener('click', async ()=>{ const sel=document.getElementById('att-patient-select'); const pid=sel.value; if(!pid){ alert('Selecione um paciente'); return; } const p=await getPatient(pid); await addAttendance({ patientId:pid, patientName:p?.name||'' }); renderAtts(); renderAll(); });
  document.getElementById('finish-att').addEventListener('click', async ()=>{ const id=document.getElementById('finish-att').dataset.id; if(!id) return; await finishAttendance(id); renderAtts(); renderAll(); });

  // delegate list actions
  document.addEventListener('click', async (e)=>{ const btn = e.target.closest('button'); if(!btn) return; const action = btn.dataset.action; const id = btn.dataset.id;
    if(action==='view-p'){ const p=await getPatient(id); alert(`Nome: ${p.name}\nEmail: ${p.email||'-'}\nTel: ${p.phone||'-'}\nNotas: ${p.notes||'-'}`); }
    if(action==='edit-p'){ const p=await getPatient(id); openPatientModal(p); }
    if(action==='del-p'){ if(confirm('Excluir paciente?')){ await deletePatient(id); renderPatients(); renderAll(); } }

    if(action==='view-appt'){ const a=await getAppt(id); if(a) alert(`Paciente: ${a.patientName}\nProcedimento: ${a.service}\nData: ${a.date||'-'}\nNotas: ${a.notes||'-'}`); }
    if(action==='edit-appt'){ const a=await getAppt(id); if(a) openApptModal(a); }
    if(action==='del-appt'){ if(confirm('Excluir consulta?')){ await deleteAppt(id); renderAppts(); renderAll(); } }

    if(action==='finish-att'){ if(confirm('Concluir atendimento?')){ await finishAttendance(id); renderAtts(); renderAll(); } }
  });

  // modal close
  const modalClose = document.getElementById('modalClose');
  if(modalClose) modalClose.addEventListener('click', closeModal);
}

/* sidebar mobile */
function openSidebarMobile(){ document.getElementById('sidebar').classList.add('open'); }
function closeSidebarMobile(){ document.getElementById('sidebar').classList.remove('open'); }

/* modal helpers */
const modal = document.getElementById('modal'), modalContent=document.getElementById('modalContent');
function openModal(html){ modalContent.innerHTML = html; modal.setAttribute('aria-hidden','false'); }
function closeModal(){ modal.setAttribute('aria-hidden','true'); modalContent.innerHTML=''; }

/* patient modal (email Gmail required) */
function validateGmail(email){
  if(!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i;
  return re.test(email);
}
async function openPatientModal(editRec){
  const isEdit = !!editRec;
  const html = `
    <h3>${isEdit?'Editar paciente':'Novo paciente'}</h3>
    <label>Nome</label><input id="m_name" value="${isEdit?escapeHtml(editRec.name):''}">
    <label>Telefone</label><input id="m_phone" value="${isEdit?escapeHtml(editRec.phone):''}">
    <label>Email (Gmail)</label><input id="m_email" placeholder="exemplo@gmail.com" value="${isEdit?escapeHtml(editRec.email):''}">
    <label>Observações</label><textarea id="m_notes">${isEdit?escapeHtml(editRec.notes):''}</textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn" id="m_cancel">Cancelar</button>
      <button class="btn primary" id="m_save">${isEdit?'Salvar':'Adicionar'}</button>
    </div>
  `;
  openModal(html);
  document.getElementById('m_cancel').addEventListener('click', closeModal);
  document.getElementById('m_save').addEventListener('click', async ()=>{
    const name=document.getElementById('m_name').value.trim();
    const email=document.getElementById('m_email').value.trim();
    if(!name){ alert('Preencha o nome'); return; }
    if(!validateGmail(email)){ alert('Informe um Gmail válido (ex: usuario@gmail.com)'); return; }
    const p={ name, phone:document.getElementById('m_phone').value.trim(), email, notes:document.getElementById('m_notes').value.trim() };
    if(isEdit){ p.id=editRec.id; await updatePatient(p); } else { await addPatient(p); }
    closeModal(); renderPatients(); populateAttSelect(); renderAll();
  });
}

/* appt modal - includes procedure select */
async function openApptModal(editRec){
  const isEdit = !!editRec;
  const patientOptions = await renderPatientOptionsHTML();
  const procedureValue = isEdit ? (escapeHtml(editRec.service) || 'Consulta') : 'Consulta';
  const dateValue = isEdit ? (escapeHtml(editRec.date) || '') : '';
  const notesValue = isEdit ? (escapeHtml(editRec.notes) || '') : '';

  const html = `
    <h3>${isEdit?'Editar consulta':'Nova consulta'}</h3>
    <label>Paciente</label>
    <select id="m_appt_patient">${patientOptions}</select>

    <label>Procedimento</label>
    <select id="m_appt_service">
      <option value="Consulta">Consulta</option>
      <option value="Limpeza">Limpeza</option>
      <option value="Canal">Canal</option>
      <option value="Restauração">Restauração</option>
      <option value="Clareamento">Clareamento</option>
      <option value="Extração">Extração</option>
    </select>

    <label>Data</label><input id="m_appt_date" type="date" value="${dateValue}">
    <label>Observações</label><textarea id="m_appt_notes">${notesValue}</textarea>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn" id="m_cancel2">Cancelar</button>
      <button class="btn primary" id="m_save2">${isEdit?'Salvar':'Agendar'}</button>
    </div>
  `;
  openModal(html);

  // set selected values after DOM insertion
  if(isEdit){
    document.getElementById('m_appt_patient').value = editRec.patientId;
    document.getElementById('m_appt_service').value = editRec.service || 'Consulta';
    document.getElementById('m_appt_date').value = editRec.date || '';
    document.getElementById('m_appt_notes').value = editRec.notes || '';
  }

  document.getElementById('m_cancel2').addEventListener('click', closeModal);
  document.getElementById('m_save2').addEventListener('click', async ()=>{
    const pid = document.getElementById('m_appt_patient').value;
    if(!pid){ alert('Selecione um paciente'); return; }
    const appt = {
      patientId: pid,
      patientName: (await getPatient(pid))?.name || '',
      service: document.getElementById('m_appt_service').value.trim(),
      date: document.getElementById('m_appt_date').value,
      notes: document.getElementById('m_appt_notes').value.trim()
    };
    if(isEdit){
      appt.id = editRec.id;
      const s = await tx(STORE_APPTS,'readwrite');
      s.put(appt).onsuccess = ()=>{ closeModal(); renderAppts(); renderAll(); };
    } else {
      await addAppt(appt);
      closeModal();
      renderAppts(); renderAll();
    }
  });
}

/* render helpers */
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function renderClinic(){ const c=await getClinic(); document.getElementById('clinicName').value=c?.name||''; document.getElementById('clinicTag').value=c?.tag||''; document.getElementById('clinicDisplayName').textContent=c?.name||'Clínica Sorriso Real'; document.getElementById('clinicDisplayTag').textContent=c?.tag||'O toque de realeza que o seu sorriso merece.'; }

async function renderAll(){
  const pats = await listPatients(); const appts = await listAppts(); const atts = await listAtts();
  document.getElementById('stat-patients').textContent = pats.length;
  const upcoming = appts.filter(a=>!a.date || new Date(a.date) >= new Date()).length;
  document.getElementById('stat-consults').textContent = upcoming;
  const waiting = atts.filter(a=>!a.finishedAt).length;
  document.getElementById('stat-waiting').textContent = waiting;
  renderRecent(appts); renderPatients(); renderAppts(); renderAtts(); renderClinic(); populateAttSelect();
}

function renderRecent(appts){
  const recent = appts.sort((a,b)=> (b.created||'').localeCompare(a.created||'')).slice(0,6);
  const container=document.getElementById('recentList'); container.innerHTML='';
  recent.forEach(a=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML = `<div><strong>${escapeHtml(a.patientName)}</strong><div class="muted">${escapeHtml(a.service)} • ${a.date||'-'}</div></div>
      <div><button class="btn" data-action="view-appt" data-id="${a.id}">Ver</button></div>`;
    container.appendChild(div);
  });
}

/* patients */
async function renderPatients(){
  const q=document.getElementById('searchPatient').value.trim().toLowerCase();
  const list = await listPatients();
  const cont=document.getElementById('patientList'); cont.innerHTML='';
  const filtered=list.filter(p=>p.name.toLowerCase().includes(q));
  if(!filtered.length){ cont.innerHTML='<div class="muted">Nenhum paciente</div>'; return; }
  filtered.sort((a,b)=>a.name.localeCompare(b.name));
  filtered.forEach(p=>{
    const el=document.createElement('div'); el.className='item';
    el.innerHTML=`<div><strong>${escapeHtml(p.name)}</strong><small class="muted">${escapeHtml(p.email||'')}</small></div>
      <div>
        <button class="btn" data-action="view-p" data-id="${p.id}">Ver</button>
        <button class="btn" data-action="edit-p" data-id="${p.id}">Editar</button>
        <button class="btn ghost" data-action="del-p" data-id="${p.id}">Excluir</button>
      </div>`;
    cont.appendChild(el);
  });
}

/* appointments */
async function renderAppts(){
  const nameFilter=document.getElementById('filterName').value.trim().toLowerCase();
  const serviceFilter=document.getElementById('filterService').value;
  const list=await listAppts();
  const cont=document.getElementById('apptList'); cont.innerHTML='';
  let filtered=list.filter(a=>{
    if(nameFilter && !a.patientName.toLowerCase().includes(nameFilter)) return false;
    if(serviceFilter && serviceFilter !== '' && a.service !== serviceFilter) return false;
    return true;
  });
  if(!filtered.length){ cont.innerHTML='<div class="muted">Nenhuma consulta</div>'; return; }
  filtered.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  filtered.forEach(a=>{
    const el=document.createElement('div'); el.className='item';
    el.innerHTML = `<div>
        <strong>${escapeHtml(a.patientName)}</strong>
        <div class="muted">${escapeHtml(a.service)} • ${a.date||'-'}</div>
        <div class="small-muted">${escapeHtml(a.notes||'')}</div>
      </div>
      <div>
        <button class="btn" data-action="view-appt" data-id="${a.id}">Ver</button>
        <button class="btn" data-action="edit-appt" data-id="${a.id}">Editar</button>
        <button class="btn ghost" data-action="del-appt" data-id="${a.id}">Excluir</button>
      </div>`;
    cont.appendChild(el);
  });
}

async function renderAtts(){
  const list=await listAtts(); const cont=document.getElementById('att-list'); cont.innerHTML='';
  if(!list.length){ cont.innerHTML='<div class="muted">Nenhum atendimento iniciado</div>'; return; }
  list.sort((a,b)=>(b.startedAt||'').localeCompare(a.startedAt||''));
  list.forEach(a=>{
    const el=document.createElement('div'); el.className='item';
    const status = a.finishedAt ? `<small class="muted">Concluído em ${new Date(a.finishedAt).toLocaleString()}</small>` : `<small class="muted">Iniciado em ${new Date(a.startedAt).toLocaleString()}</small>`;
    el.innerHTML = `<div><strong>${escapeHtml(a.patientName)}</strong>${status}</div>
      <div>${!a.finishedAt ? `<button class="btn" data-action="finish-att" data-id="${a.id}">Concluir</button>` : ''}</div>`;
    cont.appendChild(el);
  });
}

/* misc */
async function renderPatientOptionsHTML(){ const pats=await listPatients(); if(!pats.length) return '<option value="">-- sem pacientes --</option>'; return pats.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join(''); }
async function populateAttSelect(){ const sel=document.getElementById('att-patient-select'); sel.innerHTML=await renderPatientOptionsHTML(); }

/* export/import */
async function exportJSON(){ const clinic=await getClinic(); const patients=await listPatients(); const appts=await listAppts(); const atts=await listAtts(); const blob=new Blob([JSON.stringify({ clinic, patients, appts, atts },null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='sorriso_real_export.json'; a.click(); URL.revokeObjectURL(url); }
function importJSON(e){ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=async ev=>{ try{ const data=JSON.parse(ev.target.result); const db=await openDB(); const txw=db.transaction([STORE_CLINIC,STORE_PATIENTS,STORE_APPTS,STORE_ATTS],'readwrite'); if(data.clinic) txw.objectStore(STORE_CLINIC).put(Object.assign({id:'default'},data.clinic)); if(Array.isArray(data.patients)) data.patients.forEach(p=>txw.objectStore(STORE_PATIENTS).put(p)); if(Array.isArray(data.appts)) data.appts.forEach(a=>txw.objectStore(STORE_APPTS).put(a)); if(Array.isArray(data.atts)) data.atts.forEach(a=>txw.objectStore(STORE_ATTS).put(a)); txw.oncomplete=()=>{ alert('Import ok'); renderAll(); }; }catch(err){ alert('Arquivo inválido'); console.error(err); } }; reader.readAsText(file); }

/* init */
init().catch(e=>{ console.error(e); if(loadingEl) loadingEl.style.display='none'; alert('Erro inicialização: '+e); });
