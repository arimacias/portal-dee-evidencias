const DB_KEY = "portalEvidenciasDB";
const SESSION_KEY = "portalEvidenciasSession";

const defaultDB = { users: [], records: { academica: [], extra: [], proyectos: [], evidencias: [] } };
let db = loadDB();
let currentUser = null;
let activePage = "inicio";
let editingRecordId = null;
let toastTimer;

function loadDB() {
  try { return { ...defaultDB, ...JSON.parse(localStorage.getItem(DB_KEY) || "{}") }; }
  catch { return structuredClone(defaultDB); }
}
function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function showView(id) {
  ["loginView","registerView","appView"].forEach(view => document.getElementById(view).classList.toggle("hidden", view !== id));
}
function syncUser() {
  document.getElementById("topUserName").textContent = currentUser.name;
  document.getElementById("topAvatar").textContent = currentUser.name.charAt(0).toUpperCase();
}
function login(email, password) {
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return false;
  currentUser = user; localStorage.setItem(SESSION_KEY, user.id);
  syncUser(); showView("appView"); renderPage("inicio"); return true;
}

document.getElementById("showRegister").addEventListener("click", () => showView("registerView"));
document.getElementById("showLogin").addEventListener("click", () => showView("loginView"));
document.getElementById("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const ok = login(document.getElementById("loginEmail").value.trim(), document.getElementById("loginPassword").value);
  document.getElementById("loginMessage").textContent = ok ? "" : "Correo o contraseña incorrectos.";
});
document.getElementById("registerForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const message = document.getElementById("registerMessage");
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) { message.textContent = "Ese correo ya está registrado."; return; }
  const user = { id: uid(), name, email, password, phone:"", ine:"", curp:"", anp:"" };
  db.users.push(user); saveDB(); message.textContent = "";
  document.getElementById("loginEmail").value = email;
  document.getElementById("loginPassword").value = "";
  showView("loginView"); showToast("Cuenta creada. Inicia sesión.");
});
document.getElementById("logoutButton").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY); currentUser = null; showView("loginView");
});
document.getElementById("sideNav").addEventListener("click", e => {
  const button = e.target.closest("[data-page]"); if (!button) return;
  renderPage(button.dataset.page); document.querySelector(".sidebar").classList.remove("open");
});
document.getElementById("mobileMenu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelDialog").addEventListener("click", closeDialog);
document.getElementById("recordForm").addEventListener("submit", saveRecord);

const pageNames = { inicio:"Inicio", perfil:"Mi perfil", academica:"Formación académica", extra:"Formación extracurricular", proyectos:"Proyectos", evidencias:"Evidencias" };
const configs = {
  academica: { title:"Formación académica", add:"Agregar formación", fields:[
    ["nivel","Nivel o grado","select",["Preparatoria","TSU","Ingeniería","Licenciatura","Posgrado"]],
    ["institucion","Institución","text"],["carrera","Carrera o programa","text"],["periodo","Periodo","text"],["estado","Estado","select",["En curso","Concluido","Trunco"]],["descripcion","Descripción","textarea"]
  ]},
  extra: { title:"Formación extracurricular", add:"Agregar actividad", fields:[
    ["tipo","Tipo de actividad","select",["Curso","Congreso","Seminario","Taller","Certificación","Otro"]],
    ["nombre","Nombre de la actividad","text"],["institucion","Institución","text"],["fecha","Fecha","date"],["horas","Duración (horas)","number"],["descripcion","Descripción","textarea"]
  ]},
  proyectos: { title:"Proyectos", add:"Agregar proyecto", fields:[
    ["nombre","Nombre del proyecto","text"],["asignatura","Asignatura","text"],["fecha","Fecha","date"],["estado","Estado","select",["En desarrollo","Terminado","En pausa"]],["descripcion","Descripción","textarea"]
  ]},
  evidencias: { title:"Evidencias", add:"Agregar evidencia", fields:[
    ["tipo","Tipo de evidencia","select",["Certificado","Título","Carta pasante","Constancia","Reconocimiento","Otro"]],
    ["nombre","Nombre o descripción","text"],["fecha","Fecha","date"],["archivo","Nombre del archivo (opcional)","text"],["descripcion","Detalles","textarea"]
  ]}
};

function recordsFor(key) { return db.records[key].filter(r => r.userId === currentUser.id); }
function renderPage(page) {
  activePage = page;
  document.getElementById("pageHeading").textContent = pageNames[page];
  document.querySelectorAll(".nav-link[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  const content = document.getElementById("pageContent");
  if (page === "inicio") content.innerHTML = renderHome();
  else if (page === "perfil") content.innerHTML = renderProfile();
  else content.innerHTML = renderRecords(page);
}
function renderHome() {
  const counts = ["academica","extra","proyectos","evidencias"].map(k => recordsFor(k).length);
  const labels = ["Formación académica","Actividades","Proyectos","Evidencias"];
  const icons = ["▤","▣","◈","▧"];
  return `<section class="welcome"><div><p class="eyebrow" style="color:#bcd5e9">BIENVENIDO/A</p><h3>¡Hola, ${escapeHTML(currentUser.name.split(" ")[0])}!</h3><p>Este es tu espacio para consultar y organizar tus logros académicos y personales.</p></div><div class="welcome-art">📚</div></section>
  <div class="stats-grid">${counts.map((n,i)=>`<article class="stat-card"><span class="stat-icon">${icons[i]}</span><strong>${n}</strong><span>${labels[i]}</span></article>`).join("")}</div>
  <div class="section-head"><div><h3>Accesos rápidos</h3><p>Selecciona una sección para administrar tu información.</p></div></div>
  <div class="record-grid">${Object.keys(configs).map(k=>`<article class="record-card"><h4>${configs[k].title}</h4><p>${recordsFor(k).length} registro(s) guardado(s)</p><div class="card-actions"><button class="small-btn" data-go="${k}">Abrir sección →</button><button class="small-btn" data-add="${k}">＋ Agregar</button></div></article>`).join("")}</div>`;
}
function renderProfile() {
  return `<div class="profile-layout"><section class="panel profile-summary"><div class="profile-avatar">♙</div><h3>${escapeHTML(currentUser.name)}</h3><p>${escapeHTML(currentUser.email)}</p><button class="btn primary" data-edit-profile>Editar perfil</button></section>
  <section class="panel"><div class="section-head" style="margin-top:0"><div><h3>Información personal</h3><p>Datos de tu perfil de estudiante.</p></div></div><div class="detail-list">${[["Nombre",currentUser.name],["Correo",currentUser.email],["Teléfono",currentUser.phone],["INE",currentUser.ine],["CURP",currentUser.curp],["A.N.P.",currentUser.anp]].map(([a,b])=>`<div class="detail-item"><span>${a}</span><b>${escapeHTML(b || "Sin registrar")}</b></div>`).join("")}</div></section></div>`;
}
function renderRecords(key) {
  const cfg = configs[key], items = recordsFor(key);
  return `<div class="section-head"><div><h3>${cfg.title}</h3><p>Agrega, consulta, edita o elimina tus registros.</p></div><button class="btn primary" data-add="${key}">＋ ${cfg.add}</button></div>
  <div class="search-row"><input id="recordSearch" placeholder="Buscar en ${cfg.title.toLowerCase()}..." aria-label="Buscar registros"></div>
  <div class="record-grid" id="recordGrid">${items.length ? items.map(recordCard).join("") : `<div class="empty">Aún no hay registros. Usa el botón “${cfg.add}” para comenzar.</div>`}</div>`;
}
function recordCard(r) {
  const cfg = configs[activePage];
  const main = r.nombre || r.nivel || r.tipo || "Registro";
  const details = cfg.fields.filter(f=>r[f[0]] && f[0] !== "nombre").slice(0,3).map(f=>`<p><b>${f[1]}:</b> ${escapeHTML(r[f[0]])}</p>`).join("");
  return `<article class="record-card" data-record-text="${escapeHTML(Object.values(r).join(" ").toLowerCase())}"><h4>${escapeHTML(main)}</h4>${details}<div class="record-meta"><span class="tag">${escapeHTML(r.tipo || r.estado || "Guardado")}</span></div><div class="card-actions"><button class="small-btn" data-edit="${r.id}">Editar</button><button class="small-btn delete" data-delete="${r.id}">Eliminar</button></div></article>`;
}
document.getElementById("pageContent").addEventListener("click", e => {
  const go = e.target.closest("[data-go]"); if (go) return renderPage(go.dataset.go);
  const add = e.target.closest("[data-add]"); if (add) return openRecordDialog(add.dataset.add);
  const edit = e.target.closest("[data-edit]"); if (edit) return openRecordDialog(activePage, edit.dataset.edit);
  const del = e.target.closest("[data-delete]"); if (del) return deleteRecord(activePage, del.dataset.delete);
  if (e.target.closest("[data-edit-profile]")) openProfileDialog();
});
document.getElementById("pageContent").addEventListener("input", e => {
  if (e.target.id !== "recordSearch") return;
  const query = e.target.value.toLowerCase();
  document.querySelectorAll("#recordGrid .record-card").forEach(card => card.classList.toggle("hidden", !card.dataset.recordText.includes(query)));
});
function openRecordDialog(key, id=null) {
  activePage = key; editingRecordId = id;
  const cfg = configs[key], record = id ? db.records[key].find(r=>r.id===id) : {};
  document.getElementById("dialogTitle").textContent = id ? "Editar registro" : cfg.add;
  document.getElementById("dialogFields").innerHTML = cfg.fields.map(([name,label,type,options]) => {
    const value = record[name] || "";
    if (type === "select") return `<label>${label}<select name="${name}" required><option value="">Selecciona una opción</option>${options.map(o=>`<option ${value===o?"selected":""}>${o}</option>`).join("")}</select></label>`;
    if (type === "textarea") return `<label>${label}<textarea name="${name}" placeholder="${label}">${escapeHTML(value)}</textarea></label>`;
    return `<label>${label}<input name="${name}" type="${type}" value="${escapeHTML(value)}" ${["nombre","nivel","tipo"].includes(name)?"required":""} placeholder="${label}"></label>`;
  }).join("");
  document.getElementById("recordDialog").showModal();
}
function closeDialog() { document.getElementById("recordDialog").close(); editingRecordId=null; }
function saveRecord(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const values = Object.fromEntries(formData.entries());
  const key = activePage;
  if (editingRecordId) {
    const index = db.records[key].findIndex(r=>r.id===editingRecordId && r.userId===currentUser.id);
    if (index >= 0) db.records[key][index] = {...db.records[key][index], ...values};
  } else db.records[key].push({id:uid(),userId:currentUser.id,...values,createdAt:new Date().toISOString()});
  saveDB(); closeDialog(); renderPage(key); showToast("Registro guardado correctamente.");
}
function deleteRecord(key,id) {
  if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
  db.records[key] = db.records[key].filter(r=>!(r.id===id && r.userId===currentUser.id));
  saveDB(); renderPage(key); showToast("Registro eliminado.");
}
function openProfileDialog() {
  editingRecordId = "profile";
  document.getElementById("dialogTitle").textContent = "Editar perfil";
  document.getElementById("dialogFields").innerHTML = [
    ["name","Nombre completo","text"],["phone","Teléfono","tel"],["ine","INE","text"],["curp","CURP","text"],["anp","A.N.P.","text"]
  ].map(([n,l,t])=>`<label>${l}<input name="${n}" type="${t}" value="${escapeHTML(currentUser[n]||"")}" ${n==="name"?"required":""}></label>`).join("");
  document.getElementById("recordDialog").showModal();
}
// El mismo formulario guarda el perfil cuando editingRecordId es "profile".
const originalSaveRecord = saveRecord;
document.getElementById("recordForm").removeEventListener("submit", saveRecord);
document.getElementById("recordForm").addEventListener("submit", e => {
  if (editingRecordId !== "profile") return originalSaveRecord(e);
  e.preventDefault();
  const values = Object.fromEntries(new FormData(e.target).entries());
  Object.assign(currentUser, values);
  const idx = db.users.findIndex(u=>u.id===currentUser.id); if (idx>=0) db.users[idx]=currentUser;
  saveDB(); closeDialog(); syncUser(); renderPage("perfil"); showToast("Perfil actualizado.");
});

const sessionId = localStorage.getItem(SESSION_KEY);
if (sessionId) {
  currentUser = db.users.find(u=>u.id===sessionId) || null;
  if (currentUser) { syncUser(); showView("appView"); renderPage("inicio"); }
  else showView("loginView");
} else showView("loginView");
