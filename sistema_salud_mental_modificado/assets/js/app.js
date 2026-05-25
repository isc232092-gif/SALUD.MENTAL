(function(){
  'use strict';
  const APP_KEY = 'saludMentalDemoDB_v3';
  const SESSION_KEY = 'saludMentalSession_v1';

  const body = document.body;
  const path = window.location.pathname.toLowerCase();
  const page = body.dataset.page || '';
  const role = body.dataset.role || '';
  const isAuth = body.dataset.auth === 'true';

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    ensureSeedData();
    mountToastContainer();
    applyTheme();

    if(isAuth){
      renderAuthPage();
      bindAuthEvents();
      const session = getSession();
      if(session){
        redirectToRoleHome(session.role);
      }
      return;
    }

    guardRoute();
    renderShell();
    renderPage();
    bindGlobalEvents();
  }

  function seedData(){
    const now = new Date().toISOString();
    return {
      settings:{
        institution:'Sistema Integral de Atención Psicológica',
        lastReset:now
      },
      users:[
        {id:1,name:'Administrador General',email:'admin@salud.local',password:'admin123',role:'admin',active:true,phone:'2221000000'},
        {id:2,name:'Dra. Laura Morales',email:'psicologo@salud.local',password:'psico123',role:'psicologo',active:true,phone:'2222000000',specialty:'Psicología clínica'},
        {id:3,name:'Juan Pérez',email:'paciente@salud.local',password:'paciente123',role:'paciente',active:true,phone:'2223000000',career:'Ingeniería en Sistemas Computacionales',matricula:'20240001',age:21,tutor:'Mtro. Rafael Sánchez',group:'A',semester:'6'}
      ],
      appointments:[
        {id:1,patientId:3,psychologistId:2,date:'2026-04-20',time:'10:00',type:'Continuidad',status:'Confirmada',notes:'Sesión de seguimiento académico',createdAt:now},
        {id:2,patientId:3,psychologistId:2,date:'2026-04-27',time:'11:00',type:'Primera vez',status:'Pendiente',notes:'Evaluación breve',createdAt:now}
      ],
      records:[
        {patientId:3,age:21,background:'Estrés académico leve.',diagnosis:'Observación inicial',treatment:'Seguimiento semanal',notes:['Registro inicial del expediente.']}
      ],
      testTemplates:[
        {id:1,name:'Autoevaluación emocional breve',createdBy:2,active:true,questions:[
          'He presentado dificultad para concentrarme.',
          'He sentido preocupación constante.',
          'He tenido alteraciones en el sueño.',
          'He sentido fatiga sin causa clara.',
          'He experimentado tensión o irritabilidad.'
        ]}
      ],
      tests:[
        {id:1,templateId:1,templateName:'Autoevaluación emocional breve',patientId:3,date:'2026-04-10',time:'09:30',answers:[1,2,2,1,2],status:'Recibido',analysis:'',reviewedBy:null}
      ],
      psychometricUploads:[],
      talks:[
        {id:1,title:'Manejo del estrés en estudiantes',speaker:'Dra. Laura Morales',date:'2026-04-22',time:'12:00',capacity:40,description:'Plática preventiva sobre hábitos y regulación emocional.',registeredUsers:[3]},
        {id:2,title:'Ansiedad y autocuidado',speaker:'Mtro. Carlos Reyes',date:'2026-04-29',time:'10:00',capacity:35,description:'Sesión informativa para la comunidad universitaria.',registeredUsers:[]}
      ],
      notifications:[
        {id:1,userId:3,title:'Cita confirmada',message:'Tu cita del 20/04/2026 fue confirmada.',date:now,read:false},
        {id:2,userId:2,title:'Nueva solicitud de cita',message:'Se registró una nueva solicitud de cita.',date:now,read:false}
      ],
      activities:[
        {id:1,userId:3,userName:'Juan Pérez',role:'paciente',action:'Registró actividad en el módulo de citas.',date:now},
        {id:2,userId:2,userName:'Dra. Laura Morales',role:'psicologo',action:'Revisó información de pacientes asignados.',date:now}
      ]
    };
  }

  function ensureSeedData(){
    if(!localStorage.getItem(APP_KEY)){
      localStorage.setItem(APP_KEY, JSON.stringify(seedData()));
      return;
    }
    const db = getDB();
    db.users = db.users || [];
    db.appointments = db.appointments || [];
    db.records = db.records || [];
    db.tests = db.tests || [];
    db.testTemplates = db.testTemplates || [];
    db.psychometricUploads = db.psychometricUploads || [];
    db.talks = db.talks || [];
    db.notifications = db.notifications || [];
    db.activities = db.activities || [];
    db.apiMessages = db.apiMessages || [];
    db.settings = db.settings || seedData().settings;
    db.talks.forEach(t => { if(t.capacity === undefined && t.Asistentes !== undefined) t.capacity = t.Asistentes; });
    saveDB(db);
  }

  function getDB(){
    return JSON.parse(localStorage.getItem(APP_KEY) || JSON.stringify(seedData()));
  }

  function saveDB(db){
    localStorage.setItem(APP_KEY, JSON.stringify(db));
  }

  function getSession(){
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  }

  function setSession(user){
    const safeUser = {id:user.id,name:user.name,email:user.email,role:user.role};
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  }

  function clearSession(){
    sessionStorage.removeItem(SESSION_KEY);
  }
  const THEME_KEY = 'saludMentalTheme';

  function applyTheme(){
    // El sistema queda fijo en tema claro institucional.
    localStorage.setItem(THEME_KEY, 'light');
    document.body.classList.remove('dark-mode');
  }

  function toggleTheme(){
    applyTheme();
    toast('El tema oscuro fue retirado; el sistema permanece en tema blanco institucional.', 'info');
  }

  function updateThemeButton(){
    document.querySelectorAll('#themeToggleBtn').forEach(btn => btn.remove());
  }
  function validateRequired(value, label){
    if(String(value || '').trim() === ''){
      toast(`El campo ${label} es obligatorio.`, 'error');
      return false;
    }
    return true;
  }

  function validateEmail(email){
    const value = normalizeEmail(email);
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    if(!ok) toast('Ingresa un correo electrónico válido.', 'error');
    return ok;
  }

  const REGEX = {
    nombre: /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,80}$/,
    telefono: /^[0-9]{10}$/,
    matricula: /^[A-Z]{3}[0-9]{6}$/,
    semestre: /^([1-9]|1[0-2])$/,
    password: /^(?=.*[A-Za-z])(?=.*\d).{6,}$/
  };

  function normalizeEmail(email){
    return String(email || '').trim().toLowerCase();
  }

  function normalizeMatricula(matricula){
    return String(matricula || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  function validatePhone(phone){
    const value = String(phone || '').replace(/\s+/g, '');
    const ok = REGEX.telefono.test(value);
    if(!ok) toast('El teléfono debe contener exactamente 10 dígitos.', 'error');
    return ok;
  }

  function validateMatricula(matricula){
    const value = normalizeMatricula(matricula);
    const ok = REGEX.matricula.test(value);
    if(!ok) toast('La matrícula debe tener el formato ISC232092: 3 letras y 6 números.', 'error');
    return ok;
  }

  function validateInstitutionalEmail(email, matricula){
    const correo = normalizeEmail(email);
    const matriculaNormalizada = normalizeMatricula(matricula).toLowerCase();
    const correoCorrecto = `${matriculaNormalizada}@itsatlixco.edu.mx`;

    if(correo !== correoCorrecto){
      toast(`El correo debe ser: ${correoCorrecto}`, 'error');
      return false;
    }

    return true;
  }

  function validateAge(age){
    const value = Number(age || 0);
    const ok = value >= 12 && value <= 100;
    if(!ok) toast('La edad debe estar entre 12 y 100 años.', 'error');
    return ok;
  }

  function validateSemester(semester){
    const value = String(semester || '').trim();
    const ok = REGEX.semestre.test(value);
    if(!ok) toast('El semestre o grado debe estar entre 1 y 12.', 'error');
    return ok;
  }

  function validateGroup(group){
    const ok = ['A','B','C'].includes(String(group || '').toUpperCase());
    if(!ok) toast('El grupo debe ser A, B o C.', 'error');
    return ok;
  }

  function validateDateTime(date, time){
    if(!date || !time){
      toast('Selecciona fecha y hora.', 'error');
      return false;
    }
    return true;
  }

  function validatePatientFields(form){
    const name = String(form.get('name') || '').trim();
    const email = normalizeEmail(form.get('email'));
    const phone = String(form.get('phone') || '').replace(/\s+/g, '');
    const career = String(form.get('career') || '').trim();
    const matricula = normalizeMatricula(form.get('matricula'));
    const age = String(form.get('age') || '').trim();
    const tutor = String(form.get('tutor') || '').trim();
    const group = String(form.get('group') || '').trim();
    const semester = String(form.get('semester') || '').trim();

    if(!name){ toast('El nombre completo es obligatorio.', 'error'); return false; }
    if(!REGEX.nombre.test(name)){ toast('El nombre solo debe contener letras y espacios.', 'error'); return false; }
    if(!email){ toast('El correo electrónico es obligatorio.', 'error'); return false; }
    if(!validateEmail(email)) return false;
    if(!phone){ toast('El teléfono es obligatorio.', 'error'); return false; }
    if(!validatePhone(phone)) return false;
    if(!career){ toast('Selecciona una carrera.', 'error'); return false; }
    if(!matricula){ toast('La matrícula es obligatoria.', 'error'); return false; }
    if(!validateMatricula(matricula)) return false;
    if(!validateInstitutionalEmail(email, matricula)) return false;
    if(!age){ toast('La edad es obligatoria.', 'error'); return false; }
    if(!validateAge(age)) return false;
    if(!tutor){ toast('El tutor o maestro encargado es obligatorio.', 'error'); return false; }
    if(!REGEX.nombre.test(tutor)){ toast('El tutor o maestro encargado solo debe contener letras y espacios.', 'error'); return false; }
    if(!group){ toast('Selecciona un grupo.', 'error'); return false; }
    if(!validateGroup(group)) return false;
    if(!semester){ toast('El semestre o grado es obligatorio.', 'error'); return false; }
    if(!validateSemester(semester)) return false;
    return true;
  }

  function nextId(items){
    return items.length ? Math.max(...items.map(i=>Number(i.id)||0)) + 1 : 1;
  }

  function getRoot(){
    return path.includes('/admin/') || path.includes('/paciente/') || path.includes('/psicologo/') ? '../' : './';
  }

  function getUser(id){
    return getDB().users.find(u=>u.id===Number(id));
  }

  function getRecord(patientId){
    const db = getDB();
    const patient = db.users.find(u=>u.id===Number(patientId));
    let record = db.records.find(r=>r.patientId===Number(patientId));
    if(!record && patient){
      record = {patientId:patient.id,age:patient.age || 0,background:'',diagnosis:'',treatment:'',notes:[]};
      db.records.push(record);
      saveDB(db);
    }
    return record || {patientId:Number(patientId),notes:[]};
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function formatDate(value){
    if(!value) return '';
    const d = new Date(String(value).includes('T') ? value : value + 'T00:00:00');
    if(isNaN(d)) return value;
    return d.toLocaleDateString('es-MX');
  }

  function formatDateTime(value){
    const d = new Date(value);
    if(isNaN(d)) return value || '';
    return d.toLocaleString('es-MX');
  }

  function capitalize(s){
    return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  }

  function toClass(s){
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g,'');
  }

  function roleName(value){
    const map = {admin:'Administrador', psicologo:'Psicólogo', paciente:'Paciente'};
    return map[value] || capitalize(value);
  }

  function readFileAsDataURL(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function guardRoute(){
    const session = getSession();
    if(!session){
      window.location.href = getRoot() + 'login.html';
      return;
    }
    if(role && session.role !== role){
      redirectToRoleHome(session.role);
    }
  }

  function redirectToRoleHome(userRole){
    const root = getRoot();
    const map = {
      admin: root + 'admin/dashboard.html',
      psicologo: root + 'psicologo/dashboard.html',
      paciente: root + 'paciente/dashboard.html'
    };
    window.location.href = map[userRole] || (root + 'login.html');
  }

  function menuByRole(userRole){
    return {
      admin:[
        ['dashboard','Panel general','dashboard.html'],
        ['usuarios','Usuarios','usuarios.html'],
        ['citas','Citas','citas.html'],
        ['expedientes','Expedientes','expedientes.html'],
        ['platicas','Pláticas','platicas.html'],
        ['reportes','Reportes','reportes.html'],
        ['actividad','Actividad','actividad.html'],
        ['configuracion','Configuración','configuracion.html']
      ],
      psicologo:[
        ['dashboard','Panel general','dashboard.html'],
        ['pacientes','Mis pacientes','pacientes.html'],
        ['citas','Citas','citas.html'],
        ['test','Test por revisar','test.html'],
        ['expediente','Expedientes','expediente.html'],
        ['platicas','Pláticas','platicas.html'],
        ['reportes','Reportes','reportes.html'],
        ['actividad','Mi actividad','actividad.html'],
        ['lector_qr','Lector QR','../lector_qr.html']
      ],
      paciente:[
        ['dashboard','Panel general','dashboard.html'],
        ['citas','Citas','citas.html'],
        ['expediente','Expediente','expediente.html'],
        ['test','Mis tests','test.html'],
        ['platicas','Pláticas','platicas.html'],
        ['notificaciones','Notificaciones','notificaciones.html'],
        ['actividad','Mi actividad','actividad.html'],
        ['qr','Mi código QR','../codigo_qr.html']
      ]
    }[userRole] || [];
  }
  function renderAuthPage(){
    const app = document.getElementById('app');
    const settings = getDB().settings;
    const root = getRoot();

    if(page === 'login'){
      app.innerHTML = `
        <section class="auth-shell auth-shell-institutional">
          <aside class="auth-brand institutional-card">
            <div>
              <div class="institutional-logos">
                <img src="${root}assets/img/logo-tecnm.png" alt="Tecnológico Nacional de México">
                <img src="${root}assets/img/itsa-logo.png" alt="Instituto Tecnológico Superior de Atlixco">
                <img src="${root}assets/img/logo-psicologia.jpg" alt="Psicología">
              </div>
              <span class="system-kicker">TecNM Campus Atlixco</span>
              <h1>${escapeHtml(settings.institution)}</h1>
            </div>
          </aside>
          <section class="auth-card login-panel">
            <div class="login-logo-wrap">
              <img src="${root}assets/img/logo-psicologia.jpg" alt="Psicología">
            </div>
            <h2>Iniciar sesión</h2>
            <form id="loginForm" class="form-grid one">
              <div class="field"><label>Correo electrónico</label><input type="email" name="email" required></div>
              <div class="field"><label>Contraseña</label><input type="password" name="password" required></div>
              <div class="actions stacked-actions">
                <button class="btn primary" type="submit">Entrar</button>
                <a class="btn ghost" href="registro.html">Crear cuenta</a>
              </div>
            </form>
          </section>
        </section>`;
      return;
    }

    app.innerHTML = `
      <section class="auth-shell auth-shell-institutional">
        <aside class="auth-brand institutional-card">
          <div>
            <div class="institutional-logos">
              <img src="${root}assets/img/logo-tecnm.png" alt="Tecnológico Nacional de México">
              <img src="${root}assets/img/itsa-logo.png" alt="Instituto Tecnológico Superior de Atlixco">
              <img src="${root}assets/img/logo-psicologia.jpg" alt="Psicología">
            </div>
            <span class="system-kicker">Registro de usuario</span>
            <h1>${escapeHtml(settings.institution)}</h1>
          </div>
        </aside>
        <section class="auth-card">
          <h2>Crear cuenta</h2>
          <form id="registerForm" class="form-grid">
            <div class="field"><label>Nombre completo</label><input type="text" name="name" required></div>
            <div class="field"><label>Correo electrónico</label><input type="email" name="email" placeholder="isc232092@itsatlixco.edu.mx" required></div>
            <div class="field"><label>Teléfono</label><input type="text" name="phone" maxlength="10" inputmode="numeric" placeholder="2221234567" required></div>
            <div class="field">
              <label>Carrera</label>
              <select name="career" class="combo-box" required>
                <option value="" disabled selected>Seleccione una carrera</option>
                <option value="Ingeniería en Sistemas Computacionales">Ingeniería en Sistemas Computacionales</option>
                <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                <option value="Ingeniería Electromecánica">Ingeniería Electromecánica</option>
                <option value="Ingeniería Mecatrónica">Ingeniería Mecatrónica</option>
                <option value="Ingeniería Bioquímica">Ingeniería Bioquímica</option>
                <option value="Licenciatura en Gastronomía">Licenciatura en Gastronomía</option>
              </select>
            </div>
            <div class="field"><label>Matrícula</label><input type="text" name="matricula" maxlength="9" placeholder="ISC232092" required></div>
            <div class="field"><label>Edad</label><input type="number" name="age" min="12" max="100" required></div>
            <div class="field"><label>Tutor / Maestro encargado</label><input type="text" name="tutor" required></div>
            <div class="field"><label>Grupo</label><select name="group" required><option value="">Seleccione</option><option>A</option><option>B</option><option>C</option></select></div>
            <div class="field"><label>Semestre / grado</label><input type="number" name="semester" min="1" max="12" required></div>
            <div class="field"><label>Contraseña</label><input type="password" name="password" minlength="6" placeholder="Mínimo 6 caracteres, letras y números" required></div>
            <div class="actions" style="grid-column:1/-1">
              <button class="btn primary" type="submit">Registrar</button>
              <a class="btn ghost" href="login.html">Volver al acceso</a>
            </div>
          </form>
        </section>
      </section>`;
  }

  function bindAuthEvents(){
    document.addEventListener('submit', function(e){
      if(e.target.id === 'loginForm'){
        e.preventDefault();
        const form = new FormData(e.target);
        const email = normalizeEmail(form.get('email'));
        const password = String(form.get('password') || '').trim();
        if(!validateEmail(email) || !validateRequired(password, 'Contraseña')) return;
        const db = getDB();
        const user = db.users.find(u => u.email.toLowerCase() === email && u.password === password && u.active);
        if(!user){
          toast('Credenciales inválidas o cuenta inactiva.', 'error');
          return;
        }
        setSession(user);
        logActivity(user, 'Inició sesión en el sistema.');
        createNotification(user.id, 'Inicio de sesión', `Acceso correcto al sistema para ${user.name}.`);
        redirectToRoleHome(user.role);
      }

      if(e.target.id === 'registerForm'){
        e.preventDefault();
        const form = new FormData(e.target);
        const db = getDB();

        if(!validatePatientFields(form)) return;

        const email = normalizeEmail(form.get('email'));
        const password = String(form.get('password') || '').trim();
        const matricula = normalizeMatricula(form.get('matricula'));

        if(!password){ toast('La contraseña es obligatoria.', 'error'); return; }
        if(!REGEX.password.test(password)){
          toast('La contraseña debe tener mínimo 6 caracteres e incluir al menos una letra y un número.', 'error');
          return;
        }
        if(db.users.some(u => normalizeEmail(u.email) === email)){
          toast('Ese correo ya se encuentra registrado.', 'error');
          return;
        }
        if(db.users.some(u => normalizeMatricula(u.matricula) === matricula)){
          toast('La matrícula ya se encuentra registrada.', 'error');
          return;
        }

        const newId = nextId(db.users);
        const user = {
          id:newId,
          name:String(form.get('name') || '').trim(),
          email,
          phone:String(form.get('phone') || '').replace(/\s+/g, ''),
          career:String(form.get('career') || '').trim(),
          matricula,
          age:Number(form.get('age') || 0),
          tutor:String(form.get('tutor') || '').trim(),
          group:String(form.get('group') || '').toUpperCase(),
          semester:String(form.get('semester') || '').trim(),
          password,
          role:'paciente',
          active:true
        };
        db.users.push(user);
        db.records.push({patientId:newId, age:user.age, background:'', diagnosis:'', treatment:'', notes:[]});
        saveDB(db);
        setSession(user);
        logActivity(user, 'Creó su cuenta de usuario.');
        toast('Usuario registrado correctamente.', 'success');
        redirectToRoleHome('paciente');
      }
    });
  }
  
  function renderShell(){
    const session = getSession();
    const app = document.getElementById('app');
    const settings = getDB().settings;

    app.innerHTML = `
      <div class="layout">
        <aside class="sidebar" id="sidebar"></aside>
        <main class="main">
          <div class="topbar institutional-topbar">
            <div class="page-title">
              <h1>${escapeHtml(pageTitles()[page] || 'Módulo')}</h1>
            </div>
            <div class="inline topbar-actions">
              <div class="topbar-logos">
                <img src="${getRoot()}assets/img/logo-tecnm.png" alt="TecNM">
                <img src="${getRoot()}assets/img/itsa-logo.png" alt="ITSA">
              </div>
              <div class="badge active">${escapeHtml(settings.institution)}</div>
<button class="btn ghost" id="logoutBtn">Cerrar sesión</button>
            </div>
          </div>
          <section id="page-content" class="grid"></section>
        </main>
      </div>`;
    renderSidebar(session);
  }

  function renderSidebar(session){
    const sidebar = document.getElementById('sidebar');
    const links = menuByRole(session.role).map(([key,label,file]) => {
      const href = resolveMenuHref(file, session.role);
      return `
        <a class="${page === key ? 'active' : ''}" href="${href}">${label}</a>
      `;
    }).join('');

    sidebar.innerHTML = `
      <div class="brand sidebar-brand-row">
        <img class="sidebar-brand-logo" src="${getRoot()}assets/img/logo-psicologia.jpg" alt="Psicología">
        <div>
          <strong style="font-size:1.15rem">Panel psicológico</strong>
          <small>TecNM Campus Atlixco</small>
        </div>
      </div>
      <div class="user-box">
        <strong>${escapeHtml(session.name)}</strong>
        <div class="muted">${roleName(session.role)}</div>
        <div class="muted">${escapeHtml(session.email)}</div>
      </div>
      <nav class="menu">${links}</nav>`;
  }

  function resolveMenuHref(file, userRole){
    const inRoleFolder = path.includes('/admin/') || path.includes('/paciente/') || path.includes('/psicologo/');
    if(file.startsWith('../')){
      return inRoleFolder ? file : file.replace('../', '');
    }
    return inRoleFolder ? file : `${userRole}/${file}`;
  }

  function renderPage(){
    const content = document.getElementById('page-content');
    if(!content) return;
    const session = getSession();
    const db = getDB();
    const renderers = {
      dashboard: () => renderDashboard(content, session, db),
      usuarios: () => renderUsers(content, session, db),
      citas: () => renderAppointments(content, session, db),
      expedientes: () => renderRecords(content, session, db),
      expediente: () => session.role === 'paciente' ? renderRecordSingle(content, session, db) : renderRecords(content, session, db),
      test: () => renderTests(content, session, db),
      platicas: () => renderTalks(content, session, db),
      pacientes: () => renderPatients(content, session, db),
      reportes: () => renderReports(content, session, db),
      actividad: () => renderActivity(content, session, db),
      notificaciones: () => renderNotifications(content, session, db),
      configuracion: () => renderSettings(content, session, db),
      qr: () => renderQR(content, session, db)
    };
    (renderers[page] || (() => content.innerHTML = `<div class="empty">Módulo sin configuración.</div>`))();
  }
  function bindGlobalEvents(){
    document.addEventListener('click', function(e){
      const session = getSession();
      const db = getDB();

      if(e.target.matches('[data-tab-target]')){
        const selectedTab = e.target.dataset.tabTarget;
        const tabRoot = e.target.closest('.tabs-card');

        if(!tabRoot) return;

        // Importante: solo se actualizan las pestañas directas de la tarjeta actual.
        // Esto evita que las pestañas internas del expediente del psicólogo queden ocultas.
        const header = Array.from(tabRoot.children)
          .find(child => child.classList && child.classList.contains('tabs-header'));

        const tabButtons = header
          ? Array.from(header.children).filter(btn => btn.matches && btn.matches('[data-tab-target]'))
          : [];

        const tabPanels = Array.from(tabRoot.children)
          .filter(panel => panel.matches && panel.matches('[data-tab-panel]'));

        tabButtons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tabTarget === selectedTab);
        });

        tabPanels.forEach(panel => {
          panel.classList.toggle('active', panel.dataset.tabPanel === selectedTab);
        });

        if(tabRoot.dataset.tabStorage){
          sessionStorage.setItem(tabRoot.dataset.tabStorage, selectedTab);
        }

        return;
      }
if(e.target.id === 'themeToggleBtn'){
  toggleTheme();
}
      if(e.target.id === 'logoutBtn'){
        logActivity(session, 'Cerró sesión.');
        clearSession();
        window.location.href = getRoot() + 'login.html';
      }

      if(e.target.matches('[data-action="edit-user"]')){
        fillUserForm(Number(e.target.dataset.id));
      }

      if(e.target.matches('[data-action="toggle-user"]')){
        const id = Number(e.target.dataset.id);
        const user = db.users.find(u=>u.id===id);
        if(!user || user.id === session.id) return;
        user.active = !user.active;
        saveDB(db);
        logActivity(session, `${user.active ? 'Activó' : 'Desactivó'} una cuenta de usuario.`);
        toast('Estado de usuario actualizado.', 'success');
        renderPage();
      }

      if(e.target.matches('[data-action="delete-user"]')){
        const id = Number(e.target.dataset.id);
        const user = db.users.find(u=>u.id===id);
        if(!user || user.id === session.id) return;
        if(!confirm('¿Deseas eliminar este usuario del listado?')) return;
        db.users = db.users.filter(u=>u.id!==id);
        db.records = db.records.filter(r=>r.patientId!==id);
        db.appointments = db.appointments.filter(a=>a.patientId!==id && a.psychologistId!==id);
        saveDB(db);
        logActivity(session, 'Eliminó una cuenta de usuario.');
        toast('Usuario eliminado.', 'success');
        renderPage();
      }

      if(e.target.matches('[data-action="cancel-appointment"]')){
        updateAppointmentStatus(Number(e.target.dataset.id), 'Cancelada', session);
      }

      if(e.target.matches('[data-action="confirm-appointment"]')){
        updateAppointmentStatus(Number(e.target.dataset.id), 'Confirmada', session);
      }

      if(e.target.matches('[data-action="reprogram-appointment"]')){
        reprogramAppointment(Number(e.target.dataset.id), session);
      }

      if(e.target.matches('[data-action="join-talk"]')){
        const talk = db.talks.find(t=>t.id===Number(e.target.dataset.id));
        if(!talk || !session) return;
        talk.registeredUsers = talk.registeredUsers || [];
        if(!talk.registeredUsers.includes(session.id)){
          talk.registeredUsers.push(session.id);
          saveDB(db);
          createNotification(session.id, 'Registro exitoso', `Quedó registrado en la plática "${talk.title}".`);
          logActivity(session, 'Se registró en una plática disponible.');
          toast('Registro realizado en la plática.', 'success');
          renderPage();
        }
      }

      if(e.target.matches('[data-action="leave-talk"]')){
        const talk = db.talks.find(t=>t.id===Number(e.target.dataset.id));
        if(!talk || !session) return;
        talk.registeredUsers = (talk.registeredUsers || []).filter(id => id !== session.id);
        saveDB(db);
        logActivity(session, 'Canceló su registro a una plática.');
        toast('Registro retirado de la plática.', 'success');
        renderPage();
      }

      if(e.target.matches('[data-action="delete-talk"]')){
        if(!confirm('¿Deseas eliminar esta plática?')) return;
        db.talks = db.talks.filter(t=>t.id!==Number(e.target.dataset.id));
        saveDB(db);
        logActivity(session, 'Eliminó una plática.');
        toast('Plática eliminada.', 'success');
        renderPage();
      }

      if(e.target.matches('[data-action="mark-read"]')){
        const item = db.notifications.find(n=>n.id===Number(e.target.dataset.id));
        if(item){ item.read = true; saveDB(db); renderPage(); }
      }

      if(e.target.matches('[data-action="review-test"]')){
        const test = db.tests.find(t=>t.id===Number(e.target.dataset.id));
        if(test){
          const note = prompt('Escribe el análisis o respuesta que verá el paciente:');
          if(note && note.trim()){
            const analysis = note.trim();
            test.status = 'Revisado';
            test.analysis = analysis;
            test.reviewedBy = session.id;
            test.reviewedAt = new Date().toISOString();
            addRecordNote(db, test.patientId, `Análisis de test registrado por psicología: ${analysis}`);
            saveDB(db);
            apiSendPatientResponse(
              test.patientId,
              'Respuesta de test disponible',
              `Tu test "${test.templateName || 'Test'}" fue revisado. Respuesta: ${analysis}`,
              {type:'test', testId:test.id, analysis}
            );
            logActivity(session, 'Registró y envió al paciente el análisis de un test recibido.');
            toast('Test revisado, enviado al expediente y notificado al paciente.', 'success');
            renderPage();
          }
        }
      }

      if(e.target.matches('[data-action="delete-record"]')){
        const patientId = Number(e.target.dataset.patientId);
        if(!patientId) return;
        if(!confirm('¿Deseas eliminar este expediente? Esta acción no se puede deshacer.')) return;
        if(!db.records.some(r=>r.patientId===patientId)){
          toast('No se encontró el expediente a eliminar.', 'error');
          return;
        }
        db.records = db.records.filter(r=>r.patientId!==patientId);
        saveDB(db);
        logActivity(session, 'Eliminó un expediente.');
        toast('Expediente eliminado.', 'success');
        renderPage();
        return;
      }

      if(e.target.matches('[data-action="select-record"]')){
        const patientId = Number(e.target.dataset.patientId);
        if(!patientId) return;
        sessionStorage.setItem('activeRecordPatientId', String(patientId));
        sessionStorage.setItem('activeExpedienteViewTab', 'expediente');
        const selector = document.getElementById('recordPatientSelector');
        if(selector){
          selector.value = patientId;
          renderPage();
        } else {
          window.location.href = session.role === 'admin' ? getRoot() + 'admin/expedientes.html' : getRoot() + 'psicologo/expediente.html';
        }
        return;
      }

      if(e.target.matches('[data-action="select-folder"]')){
        const folder = String(e.target.dataset.folder || 'Sin carrera');
        sessionStorage.setItem('activeExpedienteFolder', folder);
        sessionStorage.setItem('activeExpedienteViewTab', 'pacientes');
        renderPage();
        return;
      }

      if(e.target.matches('[data-action="rename-folder"]')){
        const folder = String(e.target.dataset.folder || 'Sin carrera');
        const newName = prompt('Ingresa el nuevo nombre de la carpeta:', folder);
        if(newName === null) return;
        const trimmed = String(newName).trim() || 'Sin carrera';
        const patientsToUpdate = db.users.filter(u=>u.role==='paciente' && (u.career || 'Sin carrera') === folder);
        if(!patientsToUpdate.length){
          toast('No hay pacientes en esta carpeta para renombrar.', 'error');
          return;
        }
        patientsToUpdate.forEach(u=>{
          u.career = trimmed === 'Sin carrera' ? '' : trimmed;
        });
        saveDB(db);
        sessionStorage.setItem('activeExpedienteFolder', trimmed);
        toast('Carpeta renombrada.', 'success');
        renderPage();
        return;
      }

      if(e.target.matches('[data-action="delete-folder"]')){
        const folder = String(e.target.dataset.folder || 'Sin carrera');
        if(!confirm(`¿Deseas eliminar la carpeta "${folder}"? Esto quitará la categoría de carrera a los pacientes dentro de ella.`)) return;
        const patientsToUpdate = db.users.filter(u=>u.role==='paciente' && (u.career || 'Sin carrera') === folder);
        if(!patientsToUpdate.length){
          toast('No hay pacientes en esta carpeta para eliminar.', 'error');
          return;
        }
        patientsToUpdate.forEach(u=>{
          u.career = '';
        });
        saveDB(db);
        sessionStorage.removeItem('activeExpedienteFolder');
        toast('Carpeta eliminada. Los pacientes se movieron a Sin carrera.', 'success');
        renderPage();
        return;
      }

      if(e.target.matches('[data-action="export-patient-excel"]')){
        exportPatientExcel(session.id);
      }

      if(e.target.matches('[data-action="export-activities"]')){
        const rows = activityRowsForRole(session, getDB());
        exportXls('actividad.xls', rows, ['Fecha','Usuario','Rol','Actividad']);
      }

      if(e.target.matches('#exportAppointmentsBtn')){
        const rows = filterAppointmentsByRole(session, db.appointments).map(a=>({
          ID:a.id,
          Paciente:getUser(a.patientId)?.name || '',
          Psicologo:getUser(a.psychologistId)?.name || '',
          Fecha:a.date,
          Hora:a.time,
          Tipo:a.type || '',
          Estado:a.status,
          Notas:a.notes || ''
        }));
        exportXls('citas.xls', rows, ['ID','Paciente','Psicologo','Fecha','Hora','Tipo','Estado','Notas']);
      }

      if(e.target.matches('#exportUsersBtn')){
        const rows = db.users.map(u=>({
          ID:u.id,
          Nombre:u.name,
          Correo:u.email,
          Rol:roleName(u.role),
          Activo:u.active ? 'Sí' : 'No',
          Telefono:u.phone || '',
          Matricula:u.matricula || '',
          Carrera:u.career || ''
        }));
        exportXls('usuarios.xls', rows, ['ID','Nombre','Correo','Rol','Activo','Telefono','Matricula','Carrera']);
      }

      if(e.target.matches('[data-action="export-report"]')){
        exportReport(e.target.dataset.report, session);
      }

      if(e.target.matches('#resetDataBtn')){
        localStorage.removeItem(APP_KEY);
        ensureSeedData();
        toast('La información inicial se restauró correctamente.', 'success');
        renderPage();
      }

      if(e.target.matches('#btnGenerarQR')){
        generateStudentQR(session, db);
      }
    });

    document.addEventListener('submit', async function(e){
      const session = getSession();
      const db = getDB();

      if(e.target.id === 'appointmentForm'){
        e.preventDefault();
        const form = new FormData(e.target);
        const patientId = session.role === 'paciente' ? session.id : Number(form.get('patientId'));
        const psychologistId = Number(form.get('psychologistId'));
        const date = String(form.get('date') || '');
        const time = String(form.get('time') || '');
        const type = String(form.get('type') || '');
        if(!patientId){ toast('Selecciona un paciente.', 'error'); return; }
        if(!psychologistId){ toast('Selecciona un psicólogo.', 'error'); return; }
        if(!validateRequired(type, 'Tipo de atención') || !validateDateTime(date,time)) return;

        if(date < '2025-01-01'){
          toast('La fecha de la cita debe ser a partir del año 2025.', 'error');
          return;
        }

        const newAppointment = {
          id:nextId(db.appointments), patientId, psychologistId, date, time, type,
          status: session.role === 'paciente' ? 'Pendiente' : 'Confirmada',
          notes:String(form.get('notes') || '').trim(), createdAt:new Date().toISOString()
        };
        db.appointments.push(newAppointment);
        saveDB(db);
        createNotification(patientId, 'Nueva cita registrada', `Se registró la cita para el ${formatDate(date)} a las ${time}.`);
        createNotification(psychologistId, 'Nueva cita asignada', `Tiene una nueva cita agendada para ${formatDate(date)}.`);
        logActivity(session, 'Registró una cita en el sistema.');
        e.target.reset();
        sessionStorage.setItem('activeCitasTab', 'listado');
        toast('Cita guardada correctamente.', 'success');
        renderPage();
      }

      if(e.target.id === 'userForm'){
        e.preventDefault();
        saveUserFromForm(e.target, session);
      }

      if(e.target.id === 'recordForm'){
        e.preventDefault();
        const form = new FormData(e.target);
        const patientId = Number(form.get('patientId'));
        let record = db.records.find(r=>r.patientId===patientId);
        if(!record){
          record = {patientId,age:0,background:'',diagnosis:'',treatment:'',notes:[]};
          db.records.push(record);
        }
        record.age = Number(form.get('age') || 0);
        record.background = String(form.get('background') || '').trim();
        record.diagnosis = String(form.get('diagnosis') || '').trim();
        record.treatment = String(form.get('treatment') || '').trim();
        const note = String(form.get('newNote') || '').trim();
        if(note){
          record.notes = record.notes || [];
          record.notes.unshift(note);
        }
        saveDB(db);
        logActivity(session, 'Actualizó información de un expediente.');
        toast('Expediente guardado.', 'success');
        renderPage();
      }

      if(e.target.id === 'testForm'){
        e.preventDefault();
        const form = new FormData(e.target);
        const templateId = Number(form.get('templateId'));
        const template = db.testTemplates.find(t=>t.id===templateId && t.active);
        if(!template){ toast('Selecciona un test válido.', 'error'); return; }
        const answers = template.questions.map((_,i)=>Number(form.get('q'+(i+1)) || 0));
        if(answers.some(v => !v)){
          toast('Responde todas las preguntas.', 'error');
          return;
        }
        const now = new Date();
        db.tests.unshift({
          id:nextId(db.tests), templateId:template.id, templateName:template.name,
          patientId:session.id, date:now.toISOString().slice(0,10), time:now.toTimeString().slice(0,5),
          answers, status:'Recibido', analysis:'', reviewedBy:null
        });
        saveDB(db);
        logActivity(session, 'Respondió un test de preguntas.');
        createNotification(session.id, 'Test registrado', 'Se guardó el test para revisión.');
        toast('Test enviado correctamente.', 'success');
        e.target.reset();
        renderPage();
      }

      if(e.target.id === 'templateForm'){
        e.preventDefault();
        const form = new FormData(e.target);
        const name = String(form.get('name') || '').trim();
        const questions = String(form.get('questions') || '').split('\n').map(q=>q.trim()).filter(Boolean);
        if(!validateRequired(name, 'Nombre del test')) return;
        if(questions.length < 2){ toast('Agrega al menos dos preguntas, una por línea.', 'error'); return; }
        db.testTemplates.unshift({id:nextId(db.testTemplates),name,createdBy:session.id,active:true,questions});
        saveDB(db);
        logActivity(session, 'Creó un test de preguntas.');
        toast('Test creado correctamente.', 'success');
        e.target.reset();
        renderPage();
      }

      if(e.target.id === 'talkForm'){
        e.preventDefault();
        const form = new FormData(e.target);
        const required = ['title','speaker','date','time','capacity','description'];
        if(required.some(k=>!String(form.get(k)||'').trim())){
          toast('Completa todos los datos de la plática.', 'error');
          return;
        }
        db.talks.unshift({
          id:nextId(db.talks), title:String(form.get('title') || '').trim(), speaker:String(form.get('speaker') || '').trim(),
          date:String(form.get('date') || ''), time:String(form.get('time') || ''), capacity:Number(form.get('capacity') || 0),
          description:String(form.get('description') || '').trim(), registeredUsers:[]
        });
        saveDB(db);
        logActivity(session, 'Creó una plática disponible.');
        toast('Plática creada correctamente.', 'success');
        e.target.reset();
        renderPage();
      }

      if(e.target.id === 'psychometricUploadForm'){
        e.preventDefault();
        const fileInput = e.target.querySelector('input[name="image"]');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        if(!file){ toast('Selecciona una imagen del test psicométrico.', 'error'); return; }
        if(!file.type.startsWith('image/')){ toast('El archivo debe ser una imagen.', 'error'); return; }
        const imageData = await readFileAsDataURL(file);
        const now = new Date();
        db.psychometricUploads.unshift({
          id:nextId(db.psychometricUploads), patientId:session.id, fileName:file.name,
          imageData, status:'Recibido', analysis:'', psychologistId:null,
          createdAt:now.toISOString(), analyzedAt:null
        });
        saveDB(db);
        logActivity(session, 'Subió una imagen de test psicométrico.');
        toast('Imagen enviada para revisión.', 'success');
        e.target.reset();
        renderPage();
      }

      if(e.target.matches('[data-form="psychometric-analysis"]')){
        e.preventDefault();
        const form = new FormData(e.target);
        const upload = db.psychometricUploads.find(u=>u.id===Number(form.get('uploadId')));
        const analysis = String(form.get('analysis') || '').trim();
        if(!upload || !analysis){ toast('Escribe el análisis antes de guardar.', 'error'); return; }
        upload.analysis = analysis;
        upload.status = 'Revisado';
        upload.psychologistId = session.id;
        upload.analyzedAt = new Date().toISOString();
        addRecordNote(db, upload.patientId, `Análisis de test psicométrico registrado por psicología: ${analysis}`);
        saveDB(db);
        apiSendPatientResponse(
          upload.patientId,
          'Respuesta psicométrica disponible',
          `Tu test psicométrico "${upload.fileName || 'imagen'}" fue revisado. Respuesta: ${analysis}`,
          {type:'psicometrico', uploadId:upload.id, analysis}
        );
        logActivity(session, 'Registró y envió al paciente el análisis de un test psicométrico.');
        toast('Análisis guardado, enviado al expediente y notificado al paciente.', 'success');
        renderPage();
      }

      if(e.target.id === 'settingsForm'){
        e.preventDefault();
        const form = new FormData(e.target);
        db.settings.institution = String(form.get('institution') || '').trim() || db.settings.institution;
        saveDB(db);
        logActivity(session, 'Actualizó la configuración general.');
        toast('Configuración actualizada.', 'success');
        renderPage();
      }
    });

    document.addEventListener('change', function(e){
      if(['recordPatientSelector','patientSelector','testTemplateSelector'].includes(e.target.id)){
        if(e.target.id === 'recordPatientSelector'){
          sessionStorage.setItem('activeRecordPatientId', String(e.target.value || ''));
        }
        renderPage();
      }
    });

    document.addEventListener('input', function(e){
      if(e.target.id === 'recordSearchInput'){
        const input = e.target;
        const value = input.value;
        const selectionStart = input.selectionStart;
        const selectionEnd = input.selectionEnd;
        renderPage();
        const newInput = document.getElementById('recordSearchInput');
        if(newInput){
          newInput.value = value;
          newInput.focus();
          if(typeof selectionStart === 'number' && typeof selectionEnd === 'number'){
            newInput.setSelectionRange(selectionStart, selectionEnd);
          }
        }
      }
    });

    document.addEventListener('click', function(e){
      if(e.target.id === 'recordSearchBtn'){
        renderPage();
      }
    });
  }
  function saveUserFromForm(formNode, session){
    const form = new FormData(formNode);
    const db = getDB();
    const userId = Number(form.get('id') || 0);
    const selectedRole = String(form.get('role') || 'paciente');

    if(!['paciente','psicologo'].includes(selectedRole)){
      toast('Solo se pueden registrar roles de paciente o psicólogo desde esta ventana.', 'error');
      return;
    }

    if(selectedRole === 'paciente'){
      if(!validatePatientFields(form)) return;
    } else {
      if(!validateRequired(form.get('name'), 'Nombre completo') || !validateEmail(form.get('email')) || !validatePhone(form.get('phone'))) return;
    }

    const email = normalizeEmail(form.get('email'));
    const matricula = normalizeMatricula(form.get('matricula'));
    const password = String(form.get('password') || '').trim();

    if(db.users.some(u => normalizeEmail(u.email) === email && u.id !== userId)){
      toast('Ese correo ya existe.', 'error');
      return;
    }
    if(selectedRole === 'paciente' && db.users.some(u => normalizeMatricula(u.matricula) === matricula && u.id !== userId)){
      toast('La matrícula ya se encuentra registrada.', 'error');
      return;
    }
    if(password && !REGEX.password.test(password)){
      toast('La contraseña debe tener mínimo 6 caracteres e incluir al menos una letra y un número.', 'error');
      return;
    }

    if(userId){
      const user = db.users.find(u=>u.id===userId);
      if(user){
        user.name = String(form.get('name') || '').trim();
        user.email = email;
        user.phone = String(form.get('phone') || '').replace(/\s+/g, '');
        user.role = selectedRole;
        user.active = String(form.get('active')) === 'true';
        user.career = String(form.get('career') || '').trim();
        user.matricula = selectedRole === 'paciente' ? matricula : String(form.get('matricula') || '').trim();
        user.age = Number(form.get('age') || 0);
        user.tutor = String(form.get('tutor') || '').trim();
        user.group = String(form.get('group') || '').toUpperCase();
        user.semester = String(form.get('semester') || '').trim();
        user.specialty = String(form.get('specialty') || '').trim();
        if(password) user.password = password;
      }
      toast('Usuario actualizado.', 'success');
    } else {
      const newId = nextId(db.users);
      const newUser = {
        id:newId,
        name:String(form.get('name') || '').trim(),
        email,
        phone:String(form.get('phone') || '').replace(/\s+/g, ''),
        role:selectedRole,
        password: password || '123456',
        active:String(form.get('active')) === 'true',
        career:String(form.get('career') || '').trim(),
        matricula:selectedRole === 'paciente' ? matricula : String(form.get('matricula') || '').trim(),
        age:Number(form.get('age') || 0),
        tutor:String(form.get('tutor') || '').trim(),
        group:String(form.get('group') || '').toUpperCase(),
        semester:String(form.get('semester') || '').trim(),
        specialty:String(form.get('specialty') || '').trim()
      };
      db.users.push(newUser);
      if(newUser.role === 'paciente'){
        db.records.push({patientId:newId,age:newUser.age,background:'',diagnosis:'',treatment:'',notes:[]});
      }
      toast('Usuario creado.', 'success');
    }
    saveDB(db);
    logActivity(session, 'Guardó información de usuarios.');
    formNode.reset();
    renderPage();
  }

  function fillUserForm(id){
    const user = getDB().users.find(u=>u.id===id);
    const form = document.getElementById('userForm');
    if(!user || !form) return;
    form.elements.id.value = user.id;
    form.elements.name.value = user.name || '';
    form.elements.email.value = user.email || '';
    form.elements.phone.value = user.phone || '';
    form.elements.role.value = user.role === 'admin' ? 'paciente' : user.role;
    form.elements.password.value = '';
    form.elements.active.value = user.active ? 'true' : 'false';
    form.elements.career.value = user.career || '';
    form.elements.matricula.value = user.matricula || '';
    form.elements.age.value = user.age || '';
    form.elements.tutor.value = user.tutor || '';
    form.elements.group.value = user.group || '';
    form.elements.semester.value = user.semester || '';
    form.elements.specialty.value = user.specialty || '';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function updateAppointmentStatus(id, status, session){
    const db = getDB();
    const appt = db.appointments.find(a=>a.id===id);
    if(!appt) return;
    appt.status = status;
    saveDB(db);
    createNotification(appt.patientId, `Cita ${status.toLowerCase()}`, `La cita #${id} cambió a estado ${status}.`);
    if(appt.psychologistId) createNotification(appt.psychologistId, `Cita ${status.toLowerCase()}`, `La cita #${id} cambió a estado ${status}.`);
    logActivity(session, `Actualizó el estado de una cita a ${status}.`);
    toast(`Cita ${status.toLowerCase()}.`, 'success');
    renderPage();
  }

  function reprogramAppointment(id, session){
    const db = getDB();
    const appt = db.appointments.find(a=>a.id===id);
    if(!appt) return;
    const newDate = prompt('Nueva fecha en formato AAAA-MM-DD:', appt.date);
    if(!newDate) return;
    const newTime = prompt('Nueva hora en formato HH:MM:', appt.time);
    if(!newTime) return;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^\d{2}:\d{2}$/.test(newTime)){
      toast('Formato inválido. Usa AAAA-MM-DD y HH:MM.', 'error');
      return;
    }

    if(newDate < '2025-01-01'){
      toast('La fecha de la cita debe ser a partir del año 2025.', 'error');
      return;
    }

    appt.date = newDate;
    appt.time = newTime;
    appt.status = 'Reprogramada';
    saveDB(db);
    createNotification(appt.patientId, 'Cita reprogramada', `La cita #${id} fue reprogramada.`);
    if(appt.psychologistId) createNotification(appt.psychologistId, 'Cita reprogramada', `La cita #${id} fue reprogramada.`);
    logActivity(session, 'Reprogramó una cita.');
    toast('Cita reprogramada.', 'success');
    renderPage();
  }

  function addRecordNote(db, patientId, note){
    let record = db.records.find(r=>r.patientId===Number(patientId));
    if(!record){
      record = {patientId:Number(patientId),age:0,background:'',diagnosis:'',treatment:'',notes:[]};
      db.records.push(record);
    }
    record.notes = record.notes || [];
    record.notes.unshift(`${formatDateTime(new Date().toISOString())} - ${note}`);
  }

  function createNotification(userId, title, message){
    const db = getDB();
    db.notifications.unshift({
      id:nextId(db.notifications), userId, title, message, date:new Date().toISOString(), read:false
    });
    saveDB(db);
  }

  function apiSendPatientResponse(patientId, title, message, payload={}){
    // Fachada local de API: centraliza el envío de respuestas al paciente.
    // En una versión con backend, este punto se reemplaza por fetch('/api/notificaciones', ...).
    const db = getDB();
    db.apiMessages = db.apiMessages || [];
    db.apiMessages.unshift({
      id:nextId(db.apiMessages),
      patientId:Number(patientId),
      title,
      message,
      payload,
      createdAt:new Date().toISOString(),
      delivered:true
    });
    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id:nextId(db.notifications),
      userId:Number(patientId),
      title,
      message,
      date:new Date().toISOString(),
      read:false
    });
    saveDB(db);
  }

  function logActivity(user, action){
    if(!user) return;
    const db = getDB();
    db.activities = db.activities || [];
    db.activities.unshift({
      id:nextId(db.activities), userId:user.id, userName:user.name, role:user.role, action, date:new Date().toISOString()
    });
    saveDB(db);
  }
  function dashboardShortcuts(session){
    const iconMap = {
      usuarios:'👥', citas:'📅', expedientes:'📁', expediente:'📁', platicas:'🎤', actividad:'🕘',
      pacientes:'🧑‍⚕️', test:'📝', lector_qr:'📷', qr:'🔳', reportes:'📊', notificaciones:'🔔', configuracion:'⚙️'
    };
    return menuByRole(session.role)
      .filter(([key]) => key !== 'dashboard')
      .slice(0,4)
      .map(([key, label, file]) => ({
        key,
        label,
        href: resolveMenuHref(file, session.role),
        icon: iconMap[key] || '•'
      }));
  }

  function shortcutsMarkup(session){
    const items = dashboardShortcuts(session);
    return `<div class="dashboard-shortcuts">${items.map(item => `
      <a class="shortcut-card" href="${item.href}">
        <span class="shortcut-card__icon">${item.icon}</span>
        <span class="shortcut-card__text">
          <strong>${escapeHtml(item.label)}</strong>
          <small>Acceder</small>
        </span>
      </a>`).join('')}</div>`;
  }

  function dashboardHero(session, title, description = '', extraAction = ''){
    return `
      <section class="card dashboard-hero">
        <div class="dashboard-hero__content">
          <div class="dashboard-hero__head">
            <img class="dashboard-hero__logo" src="${getRoot()}assets/img/logo-psicologia.jpg" alt="Logo de Psicología">
            <div>
              <span class="hero-kicker">TecNM Campus Atlixco</span>
              <h2>${escapeHtml(title)}</h2>
              ${description ? `<p>${escapeHtml(description)}</p>` : ''}
            </div>
          </div>
          <div class="actions">${extraAction}</div>
        </div>
      </section>`;
  }

  function renderDashboard(content, session, db){
    if(session.role === 'admin'){
      content.innerHTML = `
        ${dashboardHero(session, 'Panel general')}
        ${shortcutsMarkup(session)}
        <section class="grid cards">${dashboardStats(session, db).map(statCard).join('')}</section>
        <section class="dashboard-panels">
          <article class="card"><h3>Actividad reciente</h3>${activityList(db.activities.slice(0,8))}</article>
          <article class="card"><h3>Resumen de citas</h3>${db.appointments.length ? tableAppointments(db.appointments.slice(0,6), session.role, false) : '<div class="empty">No hay citas registradas.</div>'}</article>
        </section>`;
      return;
    }

    if(session.role === 'psicologo'){
      const appointments = filterAppointmentsByRole(session, db.appointments).slice(0,6);
      const pendingTests = filterTestsByRole(session, db.tests).filter(t=>t.status!=='Revisado').slice(0,6);
      content.innerHTML = `
        ${dashboardHero(session, 'Panel general')}
        ${shortcutsMarkup(session)}
        <section class="grid cards">${dashboardStats(session, db).map(statCard).join('')}</section>
        <section class="dashboard-panels">
          <article class="card"><h3>Citas próximas</h3>${appointments.length ? tableAppointments(appointments, session.role, true) : '<div class="empty">No hay citas asignadas.</div>'}</article>
          <article class="card"><h3>Tests por revisar</h3>${pendingTests.length ? tableTestsSafe(pendingTests) : '<div class="empty">No hay tests pendientes.</div>'}</article>
        </section>`;
      return;
    }

    const myAppointments = filterAppointmentsByRole(session, db.appointments).slice(0,6);
    const myTalks = db.talks.filter(t=>(t.registeredUsers||[]).includes(session.id)).slice(0,4);
    content.innerHTML = `
      ${dashboardHero(session, 'Panel general')}
      ${shortcutsMarkup(session)}
      <section class="grid cards">${dashboardStats(session, db).map(statCard).join('')}</section>
      <section class="dashboard-panels">
        <article class="card"><h3>Mis citas recientes</h3>${myAppointments.length ? tableAppointments(myAppointments, session.role, true) : '<div class="empty">No tienes citas registradas.</div>'}</article>
        <article class="card"><h3>Pláticas inscritas</h3>${myTalks.length ? `<div class="activity-list">${myTalks.map(t => `<div class="notice"><strong>${escapeHtml(t.title)}</strong><p>${escapeHtml(t.description)}</p><small class="muted">${formatDate(t.date)} · ${escapeHtml(t.time || '')}</small></div>`).join('')}</div>` : '<div class="empty">Aún no estás inscrito en pláticas.</div>'}</article>
      </section>`;
  }

  function statCard(card){
    return `<article class="stat-card"><div class="label">${escapeHtml(card.label)}</div><div class="value">${escapeHtml(card.value)}</div></article>`;
  }function activityList(items){
  if(!items || !items.length){
    return '<div class="empty">No hay actividad reciente.</div>';
  }

  function getActivityIcon(text){
    const value = String(text || '').toLowerCase();

    if(value.includes('cancel')) return '✖';
    if(value.includes('actualiz')) return '✎';
    if(value.includes('registr')) return '👤';
    if(value.includes('expediente')) return '🗂';
    if(value.includes('cita')) return '📅';

    return '•';
  }

  function getActivityClass(text){
    const value = String(text || '').toLowerCase();

    if(value.includes('cancel')) return 'danger';
    if(value.includes('actualiz')) return 'info';
    if(value.includes('registr')) return 'neutral';
    return 'neutral';
  }

  return `
    <div class="activity-feed">
      ${items.map(item => `
        <article class="activity-item">
          <div class="activity-icon ${getActivityClass(item.action || item.message || '')}">
            ${getActivityIcon(item.action || item.message || '')}
          </div>
          <div class="activity-body">
            <div class="activity-text">
              <strong>${escapeHtml(item.userName || item.user || item.actor || 'Sistema')}</strong>
              ${escapeHtml(item.action || item.message || '')}
            </div>
            <div class="activity-time">
              ${escapeHtml(formatDateTime(item.timestamp || item.date || new Date().toISOString()))}
            </div>
          </div>
        </article>
      `).join('')}

      <div class="activity-more">
        <button class="btn ghost" type="button">Cargar más actividad</button>
      </div>
    </div>
  `;
}

  function dashboardStats(session, db){
    if(session.role === 'admin'){
      return [
        {label:'Usuarios activos', value:db.users.filter(u=>u.active).length},
        {label:'Pacientes', value:db.users.filter(u=>u.role==='paciente').length},
        {label:'Psicólogos', value:db.users.filter(u=>u.role==='psicologo').length},
        {label:'Citas', value:db.appointments.length}
      ];
    }
    if(session.role === 'psicologo'){
      const patientIds = patientIdsForPsychologist(session.id, db);
      return [
        {label:'Mis pacientes', value:patientIds.length},
        {label:'Citas asignadas', value:db.appointments.filter(a=>a.psychologistId===session.id).length},
        {label:'Tests por revisar', value:filterTestsByRole(session, db.tests).filter(t=>t.status!=='Revisado').length},
        {label:'Mi actividad', value:db.activities.filter(a=>a.userId===session.id).length}
      ];
    }
    return [
      {label:'Mis citas', value:db.appointments.filter(a=>a.patientId===session.id).length},
      {label:'Tests enviados', value:db.tests.filter(t=>t.patientId===session.id).length},
      {label:'Pláticas inscritas', value:db.talks.filter(t=>(t.registeredUsers||[]).includes(session.id)).length},
      {label:'Imágenes psicométricas', value:db.psychometricUploads.filter(u=>u.patientId===session.id).length}
    ];
  }
function renderUsers(content, session, db){
  if(session.role !== 'admin'){
    content.innerHTML = '<div class="empty">Acceso no autorizado.</div>';
    return;
  }

  const users = db.users;

  content.innerHTML = `
    <section class="card tabs-card users-tabs">
      <div class="tabs-header">
        <button class="tab-button active" type="button" data-tab-target="datos-generales">Datos generales</button>
        <button class="tab-button" type="button" data-tab-target="datos-academicos">Datos académicos</button>
        <button class="tab-button" type="button" data-tab-target="listado-usuarios">Listado de usuarios</button>
      </div>

      <div class="tab-panel active" data-tab-panel="datos-generales">
        <h3>Crear o actualizar usuario</h3>

        <form id="userForm" class="form-grid">
          <input type="hidden" name="id" value="">

          <div class="field">
            <label>Nombre completo</label>
            <input name="name" required>
          </div>

          <div class="field">
            <label>Correo electrónico</label>
            <input type="email" name="email" required>
          </div>

          <div class="field">
            <label>Teléfono</label>
            <input name="phone" maxlength="10" inputmode="numeric" required>
          </div>

          <div class="field">
            <label>Rol</label>
            <select name="role" class="combo-box" required>
              <option value="paciente">Paciente</option>
              <option value="psicologo">Psicólogo</option>
            </select>
          </div>

          <div class="field">
            <label>Contraseña</label>
            <input type="text" name="password" maxlength="8">
          </div>

          <div class="field">
            <label>Activo</label>
            <select name="active" class="combo-box">
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <div class="actions" style="grid-column:1/-1">
            <button class="btn primary" type="submit">Guardar usuario</button>
            <button class="btn ghost" type="reset">Limpiar</button>
            <button class="btn secondary" id="exportUsersBtn" type="button">Exportar Excel</button>
          </div>
        </form>
      </div>

      <div class="tab-panel" data-tab-panel="datos-academicos">
        <h3>Datos académicos</h3>

        <form class="form-grid linked-user-form">
          <div class="field">
            <label>Carrera</label>
            <select name="career" class="combo-box" form="userForm">
              <option value="">Seleccione una carrera</option>
              <option value="Ingeniería en Sistemas Computacionales">Ingeniería en Sistemas Computacionales</option>
              <option value="Ingeniería Industrial">Ingeniería Industrial</option>
              <option value="Ingeniería Electromecánica">Ingeniería Electromecánica</option>
              <option value="Ingeniería Mecatrónica">Ingeniería Mecatrónica</option>
              <option value="Ingeniería Bioquímica">Ingeniería Bioquímica</option>
              <option value="Licenciatura en Gastronomía">Licenciatura en Gastronomía</option>
            </select>
          </div>

          <div class="field">
            <label>Matrícula</label>
            <input name="matricula" minlength="9" maxlength="9" placeholder="ISC232092" form="userForm">
          </div>

          <div class="field">
            <label>Edad</label>
            <input type="number" name="age" min="12" max="100" form="userForm">
          </div>

          <div class="field">
            <label>Tutor / maestro encargado</label>
            <input name="tutor" form="userForm">
          </div>

          <div class="field">
            <label>Grupo</label>
            <select name="group" class="combo-box" form="userForm">
              <option value="">Seleccione</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </select>
          </div>

          <div class="field">
            <label>Semestre / grado</label>
            <input type="number" name="semester" min="1" max="12" form="userForm">
          </div>
        </form>
      </div>

      <div class="tab-panel" data-tab-panel="listado-usuarios">
        <h3>Listado de usuarios por ID</h3>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Matrícula</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u=>`
                <tr>
                  <td>#${u.id}</td>
                  <td>${escapeHtml(u.name)}</td>
                  <td>${escapeHtml(u.email)}</td>
                  <td>${roleName(u.role)}</td>
                  <td>
                    <span class="badge ${u.active ? 'active' : 'inactive'}">
                      ${u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>${escapeHtml(u.matricula || '')}</td>
                  <td class="action-buttons">
                    <button type="button" class="btn small secondary" data-action="edit-user" data-id="${u.id}">Editar</button>
                    <button type="button" class="btn small ${u.active ? 'warning' : 'success'}" data-action="toggle-user" data-id="${u.id}" ${u.role === 'admin' ? 'disabled' : ''}>
                      ${u.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button type="button" class="btn small danger" data-action="delete-user" data-id="${u.id}" ${u.role === 'admin' ? 'disabled' : ''}>Eliminar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>`;
  }

  function renderAppointments(content, session, db){
    const psychologists = db.users.filter(u=>u.role==='psicologo' && u.active);
    const patients = db.users.filter(u=>u.role==='paciente' && u.active);
    const appointments = filterAppointmentsByRole(session, db.appointments);
    const activeTab = sessionStorage.getItem('activeCitasTab') || 'registrar';
    const registerTitle = session.role === 'paciente' ? 'Generar cita' : 'Registrar cita';
    const patientOptions = patients.map(p => '<option value="' + p.id + '">' + escapeHtml(p.name) + ' - ' + escapeHtml(p.matricula || 'Sin matrícula') + '</option>').join('');
    const psychologistOptions = psychologists.map(p => '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>').join('');
    const patientField = session.role !== 'paciente'
      ? '<div class="field"><label>Paciente</label><select name="patientId" required><option value="">Seleccione</option>' + patientOptions + '</select></div>'
      : '';
    const exportButton = session.role !== 'paciente'
      ? '<button class="btn secondary" id="exportAppointmentsBtn" type="button">Exportar Excel</button>'
      : '';

    content.innerHTML =
      '<section class="card tabs-card">' +
        '<div class="tabs-header">' +
          '<button class="tab-button ' + (activeTab === 'registrar' ? 'active' : '') + '" type="button" data-tab-target="registrar">' + registerTitle + '</button>' +
          '<button class="tab-button ' + (activeTab === 'listado' ? 'active' : '') + '" type="button" data-tab-target="listado">Listado de citas</button>' +
        '</div>' +

        '<div class="tab-panel ' + (activeTab === 'registrar' ? 'active' : '') + '" data-tab-panel="registrar">' +
          '<h3>' + registerTitle + '</h3>' +
          '<p class="helper">Captura los datos necesarios para generar una cita de primera vez o de continuidad.</p>' +
          '<form id="appointmentForm" class="form-grid">' +
            patientField +
            '<div class="field"><label>Psicólogo</label><select name="psychologistId" required><option value="">Seleccione</option>' + psychologistOptions + '</select></div>' +
            '<div class="field"><label>Fecha</label><input type="date" name="date" min="2025-01-01" required></div>' +
            '<div class="field"><label>Hora</label><input type="time" name="time" required></div>' +
            '<div class="field"><label>Tipo de atención</label><select name="type" required><option value="">Seleccione</option><option>Primera vez</option><option>Continuidad</option></select></div>' +
            '<div class="field" style="grid-column:1/-1"><label>Notas</label><textarea name="notes" placeholder="Motivo o notas generales"></textarea></div>' +
            '<div class="actions" style="grid-column:1/-1"><button class="btn primary" type="submit">Guardar cita</button></div>' +
          '</form>' +
        '</div>' +

        '<div class="tab-panel ' + (activeTab === 'listado' ? 'active' : '') + '" data-tab-panel="listado">' +
          '<div class="section-head">' +
            '<div>' +
              '<h3>Listado de citas</h3>' +
              '<p class="helper">Consulta las citas registradas y realiza acciones de cancelar, confirmar o reprogramar.</p>' +
            '</div>' +
            exportButton +
          '</div>' +
          (appointments.length ? tableAppointments(appointments, session.role, true) : '<div class="empty">No existen citas para mostrar.</div>') +
        '</div>' +
      '</section>';
  }

  function tableAppointments(appointments, userRole, withActions){
    if(!appointments.length) return '<div class="empty">No existen citas para mostrar.</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Paciente</th><th>Matrícula</th><th>Psicólogo</th><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Estado</th>${withActions?'<th>Acciones</th>':''}</tr></thead>
      <tbody>${appointments.map(a=>{
        const patient = getUser(a.patientId);
        return `<tr>
          <td>#${a.id}</td>
          <td>${escapeHtml(patient?.name || 'Sin asignar')}</td>
          <td>${escapeHtml(patient?.matricula || '')}</td>
          <td>${escapeHtml(getUser(a.psychologistId)?.name || 'Sin asignar')}</td>
          <td>${formatDate(a.date)}</td>
          <td>${escapeHtml(a.time || '')}</td>
          <td>${escapeHtml(a.type || '')}</td>
          <td><span class="badge ${toClass(a.status)}">${escapeHtml(a.status)}</span></td>
          ${withActions ? `<td class="action-buttons">
            ${a.status !== 'Cancelada' ? `<button class="btn small danger" type="button" data-action="cancel-appointment" data-id="${a.id}">Cancelar</button>` : ''}
            ${(userRole==='psicologo' || userRole==='admin') && a.status !== 'Confirmada' && a.status !== 'Cancelada' ? `<button class="btn small success" type="button" data-action="confirm-appointment" data-id="${a.id}">Confirmar</button>` : ''}
            ${a.status !== 'Cancelada' ? `<button class="btn small secondary" type="button" data-action="reprogram-appointment" data-id="${a.id}">Reprogramar</button>` : ''}
          </td>` : ''}
        </tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function filterAppointmentsByRole(session, appointments){
    if(session.role === 'admin') return appointments;
    if(session.role === 'psicologo') return appointments.filter(a=>a.psychologistId===session.id);
    return appointments.filter(a=>a.patientId===session.id);
  }
  function renderRecords(content, session, db){
    if(!['admin','psicologo'].includes(session.role)){
      content.innerHTML = '<div class="empty">Acceso no autorizado.</div>';
      return;
    }
    const assignedPatientIds = session.role === 'psicologo'
      ? patientIdsForPsychologist(session.id, db)
      : [];

    const patients = session.role === 'psicologo'
      ? db.users.filter(u => u.role === 'paciente' && u.active && (assignedPatientIds.includes(u.id) || assignedPatientIds.length === 0))
      : db.users.filter(u=>u.role==='paciente');
    const searchQuery = String((document.getElementById('recordSearchInput') || {}).value || '').trim().toLowerCase();
    const filteredPatients = patients.filter(u => {
      const searchValue = `${u.name || ''} ${u.email || ''} ${u.matricula || ''}`.toLowerCase();
      return searchValue.includes(searchQuery);
    });
    const byCareer = groupBy(patients, p=>p.career || 'Sin carrera');
    const folders = Object.keys(byCareer);
    const activeFolder = sessionStorage.getItem('activeExpedienteFolder') || folders[0] || 'Sin carrera';
    const normalizedFolder = folders.includes(activeFolder) ? activeFolder : folders[0] || 'Sin carrera';
    const folderPatients = filteredPatients.filter(u => (u.career || 'Sin carrera') === normalizedFolder);
    const validViews = ['carpetas','pacientes','expediente','citas'];
    const storedView = sessionStorage.getItem('activeExpedienteViewTab');
    const activeView = validViews.includes(storedView) ? storedView : 'expediente';
    const validTabs = ['datos-generales','tests','imagenes','observaciones'];
    const storedTab = sessionStorage.getItem('activeExpedienteTab');
    const activeTab = validTabs.includes(storedTab) ? storedTab : 'datos-generales';
    const appointments = filterAppointmentsByRole(session, db);
    const selectedId = Number((document.getElementById('recordPatientSelector') || {}).value || sessionStorage.getItem('activeRecordPatientId') || filteredPatients[0]?.id || patients[0]?.id || 0);
    const patient = patients.find(u=>u.id===selectedId) || filteredPatients.find(u=>u.id===selectedId) || patients[0] || null;
    const resolvedId = patient ? patient.id : selectedId;
    const record = db.records.find(r=>r.patientId===resolvedId) || {patientId:resolvedId,notes:[]};
    const tests = db.tests.filter(t=>t.patientId===resolvedId);
    const uploads = db.psychometricUploads.filter(u=>u.patientId===resolvedId);

    if(!patients.length){
      content.innerHTML = `
        <section class="card">
          <h3>Expedientes</h3>
          <div class="empty">No hay pacientes registrados para mostrar en expedientes.</div>
        </section>`;
      return;
    }

    content.innerHTML = `
      <section class="grid" style="grid-template-columns:1fr">
        <article class="card tabs-card records-view-tabs" data-tab-storage="activeExpedienteViewTab">
          <div class="tabs-header">
            <button class="tab-button ${activeView === 'carpetas' ? 'active' : ''}" type="button" data-tab-target="carpetas">Carpetas</button>
            <button class="tab-button ${activeView === 'pacientes' ? 'active' : ''}" type="button" data-tab-target="pacientes">Buscar pacientes</button>
            <button class="tab-button ${activeView === 'expediente' ? 'active' : ''}" type="button" data-tab-target="expediente">Vista expediente</button>
            <button class="tab-button ${activeView === 'citas' ? 'active' : ''}" type="button" data-tab-target="citas">Citas</button>
          </div>

          <div class="tab-panel ${activeView === 'carpetas' ? 'active' : ''}" data-tab-panel="carpetas">
            <h3>Carpetas de expediente</h3>
            ${folders.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin-bottom:18px">${folders.map(career=>`
              <div class="folder-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                  <div>
                    <strong>${escapeHtml(career)}</strong>
                    <div class="muted" style="margin-top:6px">${byCareer[career].length} paciente(s)</div>
                  </div>
                  <button class="btn small ghost" type="button" data-action="select-folder" data-folder="${escapeHtml(career)}">${career===normalizedFolder ? 'Activo' : 'Abrir'}</button>
                </div>
                <div class="inline" style="justify-content:flex-end;margin-top:12px">
                  <button class="btn small secondary" type="button" data-action="rename-folder" data-folder="${escapeHtml(career)}">Renombrar</button>
                  <button class="btn small danger" type="button" data-action="delete-folder" data-folder="${escapeHtml(career)}">Eliminar</button>
                </div>
              </div>`).join('')}</div>` : '<div class="empty">No hay carpetas disponibles.</div>'}
          </div>

          <div class="tab-panel ${activeView === 'pacientes' ? 'active' : ''}" data-tab-panel="pacientes">
            <h3>Buscar pacientes</h3>
            <div class="filters">
              <div class="search-group">
                <input id="recordSearchInput" type="search" placeholder="Buscar por matrícula, nombre o correo" value="${escapeHtml(searchQuery)}">
                <button type="button" id="recordSearchBtn" class="btn search-btn">🔍 Buscar</button>
              </div>
            </div>
            ${searchQuery && !filteredPatients.length ? '<div class="empty">No se encontraron pacientes con ese criterio.</div>' : ''}
            ${filteredPatients.length ? `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Matrícula</th><th>Carrera</th><th>Correo</th><th>Acciones</th></tr></thead><tbody>${filteredPatients.map(p=>`
              <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.matricula || '')}</td>
                <td>${escapeHtml(p.career || '')}</td>
                <td>${escapeHtml(p.email)}</td>
                <td class="action-buttons"><button class="btn small primary" type="button" data-action="select-record" data-patient-id="${p.id}">Ver expediente</button> <button class="btn small danger" type="button" data-action="delete-record" data-patient-id="${p.id}">Eliminar</button></td>
              </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No hay pacientes para mostrar.</div>'}
          </div>

          <div class="tab-panel ${activeView === 'expediente' ? 'active' : ''}" data-tab-panel="expediente">
            <h3>Vista de expediente</h3>
            <p class="helper">Selecciona un paciente para ver su expediente completo.</p>
            <div class="filters">
              <select id="recordPatientSelector">${patients.map(p=>`<option value="${p.id}" ${p.id===resolvedId?'selected':''}>${escapeHtml(p.name)} - ${escapeHtml(p.matricula || '')} - ${escapeHtml(p.email || '')}</option>`).join('')}</select>
            </div>
            <div class="card tabs-card expedientes-tabs" data-tab-storage="activeExpedienteTab">
              <div class="tabs-header">
                <button class="tab-button ${activeTab === 'datos-generales' ? 'active' : ''}" type="button" data-tab-target="datos-generales">Datos generales</button>
                <button class="tab-button ${activeTab === 'tests' ? 'active' : ''}" type="button" data-tab-target="tests">Tests realizados</button>
                <button class="tab-button ${activeTab === 'imagenes' ? 'active' : ''}" type="button" data-tab-target="imagenes">Imágenes psicométricas</button>
                <button class="tab-button ${activeTab === 'observaciones' ? 'active' : ''}" type="button" data-tab-target="observaciones">Observaciones</button>
              </div>
              <div class="tab-panel ${activeTab === 'datos-generales' ? 'active' : ''}" data-tab-panel="datos-generales">
                ${patient ? patientGeneralCard(patient, record) : '<div class="empty">Selecciona un paciente.</div>'}
              </div>
              <div class="tab-panel ${activeTab === 'tests' ? 'active' : ''}" data-tab-panel="tests">
                <h3>Tests realizados</h3>
                ${tests.length ? tableTestsSafe(tests) : '<div class="empty">No hay tests registrados.</div>'}
              </div>
              <div class="tab-panel ${activeTab === 'imagenes' ? 'active' : ''}" data-tab-panel="imagenes">
                <h3>Imágenes psicométricas</h3>
                ${uploads.length ? tablePsychometricUploads(uploads, session.role) : '<div class="empty">No hay imágenes psicométricas.</div>'}
              </div>
              <div class="tab-panel ${activeTab === 'observaciones' ? 'active' : ''}" data-tab-panel="observaciones">
                <h3>Observaciones internas del expediente</h3>
                <form id="recordForm" class="form-grid one">
                  <input type="hidden" name="patientId" value="${resolvedId}">
                  <div class="field"><label>Edad</label><input type="number" name="age" value="${escapeHtml(record.age || patient?.age || '')}"></div>
                  <div class="field"><label>Antecedentes</label><textarea name="background">${escapeHtml(record.background || '')}</textarea></div>
                  <div class="field"><label>Diagnóstico</label><textarea name="diagnosis">${escapeHtml(record.diagnosis || '')}</textarea></div>
                  <div class="field"><label>Tratamiento</label><textarea name="treatment">${escapeHtml(record.treatment || '')}</textarea></div>
                  <div class="field"><label>Nueva observación</label><textarea name="newNote" placeholder="Agregar observación interna"></textarea></div>
                  <div class="actions"><button class="btn primary" type="submit">Guardar expediente</button></div>
                </form>
                ${record.patientId ? `<div class="actions" style="justify-content:flex-end;margin-top:-10px"><button class="btn danger" type="button" data-action="delete-record" data-patient-id="${resolvedId}">Eliminar expediente</button></div>` : ''}
                <hr class="sep">
                ${(record.notes || []).length ? `<ul>${record.notes.map(n=>`<li>${escapeHtml(n)}</li>`).join('')}</ul>` : '<div class="empty">No hay observaciones internas.</div>'}
              </div>
            </div>
          </div>

          <div class="tab-panel ${activeView === 'citas' ? 'active' : ''}" data-tab-panel="citas">
            <h3>Citas relacionadas</h3>
            <p class="helper">Consulta aquí las citas relacionadas con tu rol y selecciona un paciente para ver su expediente.</p>
            ${appointments.length ? tableAppointments(appointments, session.role, false) : '<div class="empty">No hay citas registradas para mostrar.</div>'}
          </div>
        </article>
      </section>`;
  }

  function renderRecordSingle(content, session, db){
    const patient = db.users.find(u=>u.id===session.id);
    const record = db.records.find(r=>r.patientId===session.id) || {notes:[]};
    const tests = db.tests.filter(t=>t.patientId===session.id);
    const uploads = db.psychometricUploads.filter(u=>u.patientId===session.id);
    const activeTab = sessionStorage.getItem('activeExpedienteSingleTab') || 'datos-generales';

    content.innerHTML = `
      <section class="card tabs-card expediente-single-tabs" data-tab-storage="activeExpedienteSingleTab">
        <div class="tabs-header">
          <button class="tab-button ${activeTab === 'datos-generales' ? 'active' : ''}" type="button" data-tab-target="datos-generales">Datos generales</button>
          <button class="tab-button ${activeTab === 'tests' ? 'active' : ''}" type="button" data-tab-target="tests">Tests realizados</button>
          <button class="tab-button ${activeTab === 'imagenes' ? 'active' : ''}" type="button" data-tab-target="imagenes">Imágenes psicométricas</button>
          <button class="tab-button ${activeTab === 'observaciones' ? 'active' : ''}" type="button" data-tab-target="observaciones">Observaciones</button>
        </div>
        <div class="tab-panel ${activeTab === 'datos-generales' ? 'active' : ''}" data-tab-panel="datos-generales">
          <h3>Mi expediente</h3>
          ${patientGeneralCard(patient, record)}
        </div>
        <div class="tab-panel ${activeTab === 'tests' ? 'active' : ''}" data-tab-panel="tests">
          <h3>Tests realizados</h3>
          ${tests.length ? tableTestsPaciente(tests) : '<div class="empty">No se han registrado tests.</div>'}
        </div>
        <div class="tab-panel ${activeTab === 'imagenes' ? 'active' : ''}" data-tab-panel="imagenes">
          <h3>Imágenes psicométricas</h3>
          ${uploads.length ? tablePsychometricUploads(uploads, session.role) : '<div class="empty">No has subido imágenes psicométricas.</div>'}
        </div>
        <div class="tab-panel ${activeTab === 'observaciones' ? 'active' : ''}" data-tab-panel="observaciones">
          <h3>Observaciones internas</h3>
          ${(record.notes || []).length ? `<ul>${record.notes.map(n=>`<li>${escapeHtml(n)}</li>`).join('')}</ul>` : '<div class="empty">No hay observaciones internas.</div>'}
        </div>
      </section>`;
  }

  function patientGeneralCard(patient, record){
    if(!patient) return '<div class="empty">Sin paciente seleccionado.</div>';
    return `<div class="patient-card">
      <div class="folder-card"><span class="folder-icon">📁</span><div><strong>${escapeHtml(patient.name)}</strong><br><span class="muted">Matrícula: ${escapeHtml(patient.matricula || 'Sin registrar')}</span></div></div>
      <div class="kpi">
        <div class="mini"><strong>Edad</strong><div>${escapeHtml(record?.age || patient.age || 'No registrada')}</div></div>
        <div class="mini"><strong>Carrera</strong><div>${escapeHtml(patient.career || 'No registrada')}</div></div>
        <div class="mini"><strong>Grupo</strong><div>${escapeHtml(patient.group || 'No registrado')}</div></div>
        <div class="mini"><strong>Semestre</strong><div>${escapeHtml(patient.semester || 'No registrado')}</div></div>
        <div class="mini"><strong>Tutor</strong><div>${escapeHtml(patient.tutor || 'No registrado')}</div></div>
        <div class="mini"><strong>Teléfono</strong><div>${escapeHtml(patient.phone || 'No registrado')}</div></div>
      </div>
    </div>`;
  }

  function renderPatients(content, session, db){
    if(session.role !== 'psicologo'){
      content.innerHTML = '<div class="empty">Acceso no autorizado.</div>';
      return;
    }
    const ids = patientIdsForPsychologist(session.id, db);
    const patients = ids.length
      ? db.users.filter(u=>ids.includes(u.id))
      : db.users.filter(u=>u.role === 'paciente' && u.active);
    content.innerHTML = `
      <section class="card">
        <h3>Mis pacientes</h3>
        ${patients.length ? `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Matrícula</th><th>Carrera</th><th>Grupo</th><th>Semestre</th><th>Tutor</th><th>Citas</th><th>Tests</th><th>Acciones</th></tr></thead><tbody>
          ${patients.map(p=>`<tr>
            <td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.matricula || '')}</td><td>${escapeHtml(p.career || '')}</td><td>${escapeHtml(p.group || '')}</td><td>${escapeHtml(p.semester || '')}</td><td>${escapeHtml(p.tutor || '')}</td>
            <td>${db.appointments.filter(a=>a.patientId===p.id && a.psychologistId===session.id).length}</td>
            <td>${db.tests.filter(t=>t.patientId===p.id).length}</td>
            <td class="action-buttons"><button class="btn small primary" type="button" data-action="select-record" data-patient-id="${p.id}">Ver expediente</button></td>
          </tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">Aún no hay pacientes asignados por cita.</div>'}
      </section>`;
  }

  function patientIdsForPsychologist(psychologistId, db){
    return [...new Set(db.appointments.filter(a=>a.psychologistId===psychologistId).map(a=>a.patientId))];
  }

  function groupBy(items, getter){
    return items.reduce((acc,item)=>{
      const key = getter(item);
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    },{});
  }
  function renderTests(content, session, db){
    if(session.role === 'paciente'){
      renderPatientTests(content, session, db);
      return;
    }
    if(session.role === 'psicologo'){
      renderPsychologistTests(content, session, db);
      return;
    }
    content.innerHTML = `
      <section class="card"><h3>Tests registrados</h3>${db.tests.length ? tableTestsSafe(db.tests) : '<div class="empty">No hay tests registrados.</div>'}</section>`;
  }

  function renderPatientTests(content, session, db){
    const templates = db.testTemplates.filter(t=>t.active);
    const selectedTemplateId = Number((document.getElementById('testTemplateSelector') || {}).value || templates[0]?.id || 0);
    const template = templates.find(t=>t.id===selectedTemplateId);
    const tests = db.tests.filter(t=>t.patientId===session.id);
    const uploads = db.psychometricUploads.filter(u=>u.patientId===session.id);
    const activeTab = sessionStorage.getItem('activeTestsTab') || 'realizar';
    const activeCreateTab = sessionStorage.getItem('activeTestCreateTab') || 'preguntas';

    content.innerHTML = `
      <section class="card tabs-card tests-tabs" data-tab-storage="activeTestsTab">
        <div class="tabs-header">
          <button class="tab-button ${activeTab === 'realizar' ? 'active' : ''}" type="button" data-tab-target="realizar">Realizar Tests</button>
          <button class="tab-button ${activeTab === 'historial' ? 'active' : ''}" type="button" data-tab-target="historial">Mis Tests</button>
        </div>

        <div class="tab-panel ${activeTab === 'realizar' ? 'active' : ''}" data-tab-panel="realizar">
          <section class="card tabs-card tests-create-tabs" data-tab-storage="activeTestCreateTab">
            <div class="tabs-header">
              <button class="tab-button ${activeCreateTab === 'preguntas' ? 'active' : ''}" type="button" data-tab-target="preguntas">Test de preguntas</button>
              <button class="tab-button ${activeCreateTab === 'psicometrico' ? 'active' : ''}" type="button" data-tab-target="psicometrico">Test psicométrico</button>
            </div>

            <div class="tab-panel ${activeCreateTab === 'preguntas' ? 'active' : ''}" data-tab-panel="preguntas">
              <article class="card">
                <h3>Test de preguntas</h3>
                ${templates.length ? `<form id="testForm" class="form-grid one">
                  <div class="field"><label>Seleccionar test</label><select id="testTemplateSelector" name="templateId">${templates.map(t=>`<option value="${t.id}" ${t.id===selectedTemplateId?'selected':''}>${escapeHtml(t.name)}</option>`).join('')}</select></div>
                  ${(template?.questions || []).map((q,i)=>`<div class="field"><label>${i+1}. ${escapeHtml(q)}</label><select name="q${i+1}" required><option value="">Seleccione</option><option value="1">1 - Nunca</option><option value="2">2 - A veces</option><option value="3">3 - Frecuente</option><option value="4">4 - Casi siempre</option></select></div>`).join('')}
                  <div class="actions"><button class="btn primary" type="submit">Enviar test</button></div>
                </form>` : '<div class="empty">No hay tests disponibles.</div>'}
              </article>
            </div>

            <div class="tab-panel ${activeCreateTab === 'psicometrico' ? 'active' : ''}" data-tab-panel="psicometrico">
              <article class="card">
                <h3>Test psicométrico</h3>
                <p class="helper">En este apartado solo se sube la imagen del test psicométrico. El análisis lo registra el psicólogo.</p>
                <form id="psychometricUploadForm" class="form-grid one">
                  <div class="field"><label>Imagen del test</label><input type="file" name="image" accept="image/*" required></div>
                  <div class="actions"><button class="btn primary" type="submit">Subir imagen</button></div>
                </form>
              </article>
            </div>
          </section>
        </div>

        <div class="tab-panel ${activeTab === 'historial' ? 'active' : ''}" data-tab-panel="historial">
          <section class="grid" style="grid-template-columns:1fr 1fr">
            <article class="card"><h3>Mis tests enviados</h3>${tests.length ? tableTestsPaciente(tests) : '<div class="empty">Aún no hay tests enviados.</div>'}</article>
            <article class="card"><h3>Mis imágenes psicométricas</h3>${uploads.length ? tablePsychometricUploads(uploads, session.role) : '<div class="empty">Aún no has subido imágenes.</div>'}</article>
          </section>
        </div>
      </section>`;
  }

  function renderPsychologistTests(content, session, db){
    const patientIds = patientIdsForPsychologist(session.id, db);
    const tests = db.tests.filter(t=>patientIds.includes(t.patientId));
    const uploads = db.psychometricUploads.filter(u=>patientIds.includes(u.patientId));
    const appointments = db.appointments.filter(a=>a.psychologistId===session.id);
    const activeTab = sessionStorage.getItem('activePsychologistTestsTab') || 'crear';

    content.innerHTML = `
      <section class="card tabs-card tests-tabs" data-tab-storage="activePsychologistTestsTab">
        <div class="tabs-header">
          <button class="tab-button ${activeTab === 'crear' ? 'active' : ''}" type="button" data-tab-target="crear">Crear test</button>
          <button class="tab-button ${activeTab === 'citas' ? 'active' : ''}" type="button" data-tab-target="citas">Citas relacionadas</button>
          <button class="tab-button ${activeTab === 'tests' ? 'active' : ''}" type="button" data-tab-target="tests">Tests recibidos</button>
          <button class="tab-button ${activeTab === 'psicometrico' ? 'active' : ''}" type="button" data-tab-target="psicometrico">Psicométricos</button>
        </div>

        <div class="tab-panel ${activeTab === 'crear' ? 'active' : ''}" data-tab-panel="crear">
          <article class="card">
            <h3>Crear test de preguntas</h3>
            <form id="templateForm" class="form-grid one">
              <div class="field"><label>Nombre del test</label><input name="name" placeholder="Ej. Test de ansiedad breve" required></div>
              <div class="field"><label>Preguntas</label><textarea name="questions" placeholder="Escribe una pregunta por línea" required></textarea></div>
              <div class="actions"><button class="btn primary" type="submit">Guardar test</button></div>
            </form>
          </article>
        </div>

        <div class="tab-panel ${activeTab === 'citas' ? 'active' : ''}" data-tab-panel="citas">
          <article class="card">
            <h3>Citas relacionadas</h3>
            ${appointments.length ? tableAppointments(appointments.slice(0,6), session.role, true) : '<div class="empty">No hay citas asignadas.</div>'}
          </article>
        </div>

        <div class="tab-panel ${activeTab === 'tests' ? 'active' : ''}" data-tab-panel="tests">
          <article class="card"><h3>Tests recibidos</h3>${tests.length ? tableTestsForReview(tests) : '<div class="empty">No hay tests recibidos.</div>'}</article>
        </div>

        <div class="tab-panel ${activeTab === 'psicometrico' ? 'active' : ''}" data-tab-panel="psicometrico">
          <article class="card"><h3>Tests psicométricos recibidos</h3>${uploads.length ? tablePsychometricUploads(uploads, session.role, true) : '<div class="empty">No hay imágenes psicométricas recibidas.</div>'}</article>
        </div>
      </section>`;
  }

  function formatTestAnswers(test){
    const template = getDB().testTemplates.find(t=>t.id===test.templateId);
    const labels = {1:'Nunca',2:'A veces',3:'Frecuente',4:'Casi siempre'};
    return (test.answers || []).map((answer, index)=>{
      const question = template?.questions?.[index] || `Pregunta ${index + 1}`;
      return `${index + 1}. ${question}: ${answer} - ${labels[answer] || 'Sin respuesta'}`;
    }).join(' | ');
  }

  function tableTestsSafe(tests){
    return `<div class="table-wrap"><table><thead><tr><th>Nombre del test</th><th>Paciente</th><th>Matrícula</th><th>Fecha</th><th>Hora</th><th>Respuestas</th><th>Análisis / respuesta</th><th>Estado</th></tr></thead><tbody>
      ${tests.map(t=>{
        const patient = getUser(t.patientId);
        return `<tr><td>${escapeHtml(t.templateName || 'Test')}</td><td>${escapeHtml(patient?.name || '')}</td><td>${escapeHtml(patient?.matricula || '')}</td><td>${formatDate(t.date)}</td><td>${escapeHtml(t.time || '')}</td><td>${escapeHtml(formatTestAnswers(t) || 'Sin respuestas')}</td><td>${escapeHtml(t.analysis || 'Pendiente de revisión')}</td><td><span class="badge ${toClass(t.status || 'Recibido')}">${escapeHtml(t.status || 'Recibido')}</span></td></tr>`;
      }).join('')}
    </tbody></table></div>`;
  }

  function tableTestsPaciente(tests){
    return `<div class="table-wrap"><table><thead><tr><th>Nombre del test</th><th>Fecha</th><th>Hora</th><th>Análisis / respuesta</th><th>Estado</th></tr></thead><tbody>
      ${tests.map(t=>`<tr>
        <td>${escapeHtml(t.templateName || 'Test')}</td>
        <td>${formatDate(t.date)}</td>
        <td>${escapeHtml(t.time || '')}</td>
        <td class="analysis-cell">${escapeHtml(t.analysis || 'Pendiente de revisión')}</td>
        <td><span class="badge ${toClass(t.status || 'Recibido')}">${escapeHtml(t.status || 'Recibido')}</span></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  function tableTestsForReview(tests){
    return `<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Test</th><th>Matrícula</th><th>Fecha</th><th>Hora</th><th>Respuestas</th><th>Análisis / respuesta</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      ${tests.map(t=>{
        const patient = getUser(t.patientId);
        return `<tr>
          <td>${escapeHtml(patient?.name || '')}</td>
          <td>${escapeHtml(t.templateName || 'Test')}</td>
          <td>${escapeHtml(patient?.matricula || '')}</td>
          <td>${formatDate(t.date)}</td>
          <td>${escapeHtml(t.time || '')}</td>
          <td>${escapeHtml(formatTestAnswers(t) || 'Sin respuestas')}</td>
          <td>${escapeHtml(t.analysis || 'Pendiente de revisión')}</td>
          <td><span class="badge ${toClass(t.status || 'Recibido')}">${escapeHtml(t.status || 'Recibido')}</span></td>
          <td class="action-buttons"><button class="btn small primary" type="button" data-action="review-test" data-id="${t.id}">Registrar / editar respuesta</button></td>
        </tr>`;
      }).join('')}
    </tbody></table></div>`;
  }

  function tablePsychometricUploads(uploads, userRole, withAnalysisForm=false){
    return `<div class="psychometric-list">${uploads.map(u=>{
      const patient = getUser(u.patientId);
      return `<div class="notice">
        <div class="inline" style="justify-content:space-between"><strong>${escapeHtml(patient?.name || 'Paciente')}</strong><span class="badge ${toClass(u.status)}">${escapeHtml(u.status)}</span></div>
        <div class="muted">Matrícula: ${escapeHtml(patient?.matricula || '')} · ${formatDateTime(u.createdAt)}</div>
        <img src="${u.imageData}" alt="Test psicométrico" class="image-preview">
        ${u.analysis ? `<p><strong>Análisis:</strong> ${escapeHtml(u.analysis)}</p>` : ''}
        ${withAnalysisForm && userRole === 'psicologo' ? `<form data-form="psychometric-analysis" class="form-grid one" style="margin-top:12px"><input type="hidden" name="uploadId" value="${u.id}"><div class="field"><label>Análisis del psicólogo</label><textarea name="analysis" placeholder="Escribir análisis del test psicométrico">${escapeHtml(u.analysis || '')}</textarea></div><div class="actions"><button class="btn primary" type="submit">Guardar análisis</button></div></form>` : ''}
      </div>`;
    }).join('')}</div>`;
  }

  function filterTestsByRole(session, tests){
    if(session.role === 'admin') return tests;
    if(session.role === 'psicologo'){
      const ids = patientIdsForPsychologist(session.id, getDB());
      return tests.filter(t=>ids.includes(t.patientId));
    }
    return tests.filter(t=>t.patientId===session.id);
  }
  function renderTalks(content, session, db){
    const talks = db.talks;
    const activeTab = sessionStorage.getItem('activeTalksTab') || (session.role === 'paciente' ? 'disponibles' : 'crear');
    const registeredTalks = talks.filter(t => (t.registeredUsers || []).includes(session.id));

    content.innerHTML = `
      <section class="card tabs-card talks-tabs" data-tab-storage="activeTalksTab">
        <div class="tabs-header">
          ${session.role !== 'paciente' ? `<button class="tab-button ${activeTab === 'crear' ? 'active' : ''}" type="button" data-tab-target="crear">Crear plática</button>` : ''}
          <button class="tab-button ${activeTab === 'disponibles' ? 'active' : ''}" type="button" data-tab-target="disponibles">Pláticas disponibles</button>
          ${session.role === 'paciente' ? `<button class="tab-button ${activeTab === 'inscritas' ? 'active' : ''}" type="button" data-tab-target="inscritas">Mis pláticas</button>` : ''}
        </div>

        ${session.role !== 'paciente' ? `<div class="tab-panel ${activeTab === 'crear' ? 'active' : ''}" data-tab-panel="crear">
          <section class="card"><h3>Crear plática</h3><form id="talkForm" class="form-grid">
            <div class="field"><label>Título</label><input name="title" required></div>
            <div class="field"><label>Ponente</label><input name="speaker" required></div>
            <div class="field"><label>Fecha</label><input type="date" name="date" required></div>
            <div class="field"><label>Hora</label><input type="time" name="time" required></div>
            <div class="field"><label>Cupo</label><input type="number" name="capacity" min="1" required></div>
            <div class="field" style="grid-column:1/-1"><label>Descripción</label><textarea name="description" required></textarea></div>
            <div class="actions" style="grid-column:1/-1"><button class="btn primary" type="submit">Guardar plática</button></div>
          </form></section>
        </div>` : ''}

        <div class="tab-panel ${activeTab === 'disponibles' ? 'active' : ''}" data-tab-panel="disponibles">
          <section class="card"><h3>Pláticas disponibles</h3><div class="grid cards">
            ${talks.map(t=>{
              const registered = (t.registeredUsers || []).includes(session.id);
              return `<article class="stat-card"><div class="label">${formatDate(t.date)} - ${escapeHtml(t.time || '')}</div><div style="font-size:1.1rem;font-weight:800;margin:.4rem 0">${escapeHtml(t.title)}</div><div class="muted">${escapeHtml(t.speaker)}</div><p>${escapeHtml(t.description)}</p><div class="inline"><span class="badge completada">${(t.registeredUsers || []).length}/${t.capacity || 0} asistentes</span>${session.role === 'paciente' ? `<button type="button" class="btn small ${registered ? 'danger' : 'primary'}" data-action="${registered ? 'leave-talk' : 'join-talk'}" data-id="${t.id}">${registered ? 'Cancelar registro' : 'Registrarme'}</button>` : `<button type="button" class="btn small danger" data-action="delete-talk" data-id="${t.id}">Eliminar</button>`}</div></article>`;
            }).join('')}
          </div></section>
        </div>

        ${session.role === 'paciente' ? `<div class="tab-panel ${activeTab === 'inscritas' ? 'active' : ''}" data-tab-panel="inscritas">
          <section class="card"><h3>Mis pláticas inscritas</h3>${registeredTalks.length ? `<div class="grid cards">${registeredTalks.map(t=>`<article class="stat-card"><div class="label">${formatDate(t.date)} - ${escapeHtml(t.time || '')}</div><div style="font-size:1.1rem;font-weight:800;margin:.4rem 0">${escapeHtml(t.title)}</div><div class="muted">${escapeHtml(t.speaker)}</div><p>${escapeHtml(t.description)}</p><div class="inline"><span class="badge completada">${(t.registeredUsers || []).length}/${t.capacity || 0} asistentes</span><button type="button" class="btn small danger" data-action="leave-talk" data-id="${t.id}">Cancelar registro</button></div></article>`).join('')}</div>` : '<div class="empty">Aún no estás inscrito en pláticas.</div>'}</section>
        </div>` : ''}
      </section>`;
  }

  function renderQR(content, session, db){
    if(session.role !== 'paciente'){
      content.innerHTML = `<div class="empty">Acceso no autorizado.</div>`;
      return;
    }
    content.innerHTML = `
      <section class="card" style="max-width:760px">
        <h3>Código QR del alumno</h3>
        <p>Este código QR contiene tus datos personales y puede ser utilizado para registro de asistencia.</p>
        <div class="actions"><button id="btnGenerarQR" class="btn primary" type="button">Generar código QR</button></div>
        <div id="qrContainer" class="qr-box"></div>
      </section>`;
  }

  function generateStudentQR(session, db){
    const container = document.getElementById('qrContainer');
    if(!container) return;
    const student = db.users.find(u=>u.id===session.id);
    const data = {
      tipo:'usuario',
      usuarioId:student.id,
      nombre:student.name,
      correo:student.email,
      email:student.email,
      matricula:student.matricula || '',
      carrera:student.career || '',
      grupo:student.group || '',
      semestre:student.semester || '',
      tutor:student.tutor || '',
      fechaGeneracion:new Date().toISOString()
    };
    container.innerHTML = '';
    if(typeof QRCode !== 'undefined'){
      new QRCode(container, {text:JSON.stringify(data), width:250, height:250});
    } else {
      container.innerHTML = `<div class="empty"><strong>Datos del QR:</strong><br>${escapeHtml(JSON.stringify(data))}</div>`;
    }
    logActivity(session, 'Generó su código QR de alumno.');
    toast('Código QR generado.', 'success');
  }
  function renderReports(content, session, db){
    if(!['admin','psicologo'].includes(session.role)){
      content.innerHTML = '<div class="empty">Acceso no autorizado.</div>';
      return;
    }
    const appointments = filterAppointmentsByRole(session, db.appointments);
    const tests = filterTestsByRole(session, db.tests);
    const patientIds = session.role === 'psicologo' ? patientIdsForPsychologist(session.id, db) : db.users.filter(u=>u.role==='paciente').map(u=>u.id);
    const patients = db.users.filter(u=>patientIds.includes(u.id));
    const uploads = session.role === 'psicologo'
      ? db.psychometricUploads.filter(u=>patientIds.includes(u.patientId))
      : db.psychometricUploads;
    const asistencias = getQRAsistenciasForRole(session);
    const reportCards = [
      ['Pacientes', patients.length],
      ['Citas registradas', appointments.length],
      ['Citas confirmadas', appointments.filter(a=>a.status==='Confirmada').length],
      ['Tests de preguntas', tests.length],
      ['Psicométricos revisados', uploads.filter(u=>u.status==='Revisado').length],
      ['Asistencias QR', asistencias.length]
    ];

    content.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h3>Reportes del sistema</h3>
            <p class="helper">Genera reportes filtrados por rol y expórtalos a Excel. Administrador ve todo; psicólogo ve sus pacientes asignados.</p>
          </div>
        </div>
        <div class="kpi">
          ${reportCards.map(([label,value])=>`<div class="mini"><strong>${label}</strong><div style="margin-top:6px;font-size:1.35rem;font-weight:800">${value}</div></div>`).join('')}
        </div>
        <div class="actions report-actions" style="margin-top:18px;justify-content:flex-start;flex-wrap:wrap">
          <button class="btn primary" type="button" data-action="export-report" data-report="general">Exportar resumen general</button>
          <button class="btn secondary" type="button" data-action="export-report" data-report="citas">Exportar citas</button>
          <button class="btn secondary" type="button" data-action="export-report" data-report="tests">Exportar tests y respuestas</button>
          <button class="btn secondary" type="button" data-action="export-report" data-report="expedientes">Exportar expedientes</button>
          <button class="btn secondary" type="button" data-action="export-report" data-report="asistencias">Exportar asistencias QR</button>
          ${session.role === 'admin' ? '<button class="btn secondary" type="button" data-action="export-report" data-report="usuarios">Exportar usuarios</button>' : ''}
        </div>
      </section>
      <section class="grid" style="grid-template-columns:1fr 1fr">
        <article class="card"><h3>Citas recientes</h3>${appointments.length ? tableAppointments(appointments.slice(0,8), session.role, false) : '<div class="empty">No hay citas para reportar.</div>'}</article>
        <article class="card"><h3>Tests y respuestas recientes</h3>${tests.length ? tableTestsSafe(tests.slice(0,8)) : '<div class="empty">No hay tests para reportar.</div>'}</article>
      </section>`;
  }

  function getQRAsistenciasForRole(session){
    const asistencias = JSON.parse(localStorage.getItem('asistencias') || '[]');
    if(session.role === 'admin') return asistencias;
    return asistencias.filter(a => String(a.registradoPor || '').toLowerCase().includes(String(session.name || '').toLowerCase()));
  }

  function exportReport(type, session){
    const db = getDB();
    const appointments = filterAppointmentsByRole(session, db.appointments);
    const tests = filterTestsByRole(session, db.tests);
    const patientIds = session.role === 'psicologo' ? patientIdsForPsychologist(session.id, db) : db.users.filter(u=>u.role==='paciente').map(u=>u.id);
    const patients = db.users.filter(u=>patientIds.includes(u.id));
    const uploads = session.role === 'psicologo' ? db.psychometricUploads.filter(u=>patientIds.includes(u.patientId)) : db.psychometricUploads;
    const asistencias = getQRAsistenciasForRole(session);

    if(type === 'general'){
      const rows = [
        {Indicador:'Usuarios activos', Valor:db.users.filter(u=>u.active).length},
        {Indicador:'Pacientes', Valor:patients.length},
        {Indicador:'Psicólogos', Valor:db.users.filter(u=>u.role==='psicologo').length},
        {Indicador:'Citas registradas', Valor:appointments.length},
        {Indicador:'Citas confirmadas', Valor:appointments.filter(a=>a.status==='Confirmada').length},
        {Indicador:'Citas pendientes', Valor:appointments.filter(a=>a.status==='Pendiente').length},
        {Indicador:'Tests de preguntas', Valor:tests.length},
        {Indicador:'Tests revisados', Valor:tests.filter(t=>t.status==='Revisado').length},
        {Indicador:'Imágenes psicométricas', Valor:uploads.length},
        {Indicador:'Asistencias QR', Valor:asistencias.length}
      ];
      exportXls('reporte_general.xls', rows, ['Indicador','Valor']);
      return;
    }

    if(type === 'usuarios'){
      const rows = db.users.map(u=>({ID:u.id, Nombre:u.name, Correo:u.email, Rol:roleName(u.role), Activo:u.active?'Sí':'No', Telefono:u.phone||'', Matricula:u.matricula||'', Carrera:u.career||'', Grupo:u.group||'', Semestre:u.semester||''}));
      exportXls('reporte_usuarios.xls', rows, ['ID','Nombre','Correo','Rol','Activo','Telefono','Matricula','Carrera','Grupo','Semestre']);
      return;
    }

    if(type === 'citas'){
      const rows = appointments.map(a=>({ID:a.id, Paciente:getUser(a.patientId)?.name||'', Matricula:getUser(a.patientId)?.matricula||'', Psicologo:getUser(a.psychologistId)?.name||'', Fecha:a.date, Hora:a.time, Tipo:a.type||'', Estado:a.status, Notas:a.notes||''}));
      exportXls('reporte_citas.xls', rows, ['ID','Paciente','Matricula','Psicologo','Fecha','Hora','Tipo','Estado','Notas']);
      return;
    }

    if(type === 'tests'){
      const rows = tests.map(t=>({ID:t.id, Paciente:getUser(t.patientId)?.name||'', Matricula:getUser(t.patientId)?.matricula||'', Test:t.templateName||'', Fecha:t.date, Hora:t.time, Respuestas:formatTestAnswers(t), Analisis:t.analysis||'', Estado:t.status||''}));
      exportXls('reporte_tests_respuestas.xls', rows, ['ID','Paciente','Matricula','Test','Fecha','Hora','Respuestas','Analisis','Estado']);
      return;
    }

    if(type === 'expedientes'){
      const rows = patients.map(p=>{
        const record = db.records.find(r=>r.patientId===p.id) || {};
        return {ID:p.id, Paciente:p.name, Matricula:p.matricula||'', Carrera:p.career||'', Grupo:p.group||'', Semestre:p.semester||'', Tutor:p.tutor||'', Edad:record.age||p.age||'', Antecedentes:record.background||'', Diagnostico:record.diagnosis||'', Tratamiento:record.treatment||'', Observaciones:(record.notes||[]).join(' | ')};
      });
      exportXls('reporte_expedientes.xls', rows, ['ID','Paciente','Matricula','Carrera','Grupo','Semestre','Tutor','Edad','Antecedentes','Diagnostico','Tratamiento','Observaciones']);
      return;
    }

    if(type === 'asistencias'){
      const rows = asistencias.map(a=>({PacienteID:a.pacienteId||a.usuarioId||'', Nombre:a.nombre||'', Matricula:a.matricula||'', Carrera:a.carrera||'', Grupo:a.grupo||'', Platica:a.platica||'', Fecha:a.fecha||'', RegistradoPor:a.registradoPor||''}));
      exportXls('reporte_asistencias_qr.xls', rows, ['PacienteID','Nombre','Matricula','Carrera','Grupo','Platica','Fecha','RegistradoPor']);
      return;
    }

    toast('Tipo de reporte no reconocido.', 'error');
  }


  function renderActivity(content, session, db){
    const items = session.role === 'admin' ? db.activities : db.activities.filter(a=>a.userId===session.id);
    content.innerHTML = `
      <section class="card">
        <div class="inline"><h3>Actividad del sistema</h3></div>
        ${activityList(items)}
      </section>`;
  }

  function activityRowsForRole(session, db){
    const items = session.role === 'admin' ? db.activities : db.activities.filter(a=>a.userId===session.id);
    return items.map(a=>({Fecha:formatDateTime(a.date), Usuario:a.userName || '', Rol:roleName(a.role), Actividad:a.action}));
  }

  function renderNotifications(content, session, db){
    const items = db.notifications.filter(n=>n.userId===session.id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    content.innerHTML = `<section class="card"><h3>Notificaciones</h3>${items.length ? items.map(n=>`<div class="notice ${n.read ? '' : 'unread'}"><div class="inline" style="justify-content:space-between"><strong>${escapeHtml(n.title)}</strong><span class="muted">${formatDateTime(n.date)}</span></div><p>${escapeHtml(n.message)}</p>${n.read ? '' : `<button class="btn small ghost" type="button" data-action="mark-read" data-id="${n.id}">Marcar como leída</button>`}</div>`).join('') : '<div class="empty">No hay notificaciones.</div>'}</section>`;
  }

  function renderSettings(content, session, db){
    if(session.role !== 'admin'){
      content.innerHTML = '<div class="empty">Acceso no autorizado.</div>';
      return;
    }
    content.innerHTML = `
      <section class="card"><h3>Configuración general</h3><form id="settingsForm" class="form-grid one">
        <div class="field"><label>Nombre de la institución</label><input name="institution" value="${escapeHtml(db.settings.institution || '')}"></div>
        <div class="actions"><button class="btn primary" type="submit">Guardar configuración</button><button class="btn danger" id="resetDataBtn" type="button">Restablecer información inicial</button></div>
      </form></section>`;
  }
  function exportPatientExcel(patientId){
    const db = getDB();
    const patient = db.users.find(u=>u.id===patientId);
    if(!patient){ toast('No se encontró el alumno.', 'error'); return; }
    const appointments = db.appointments.filter(a=>a.patientId===patientId);
    const tests = db.tests.filter(t=>t.patientId===patientId);
    const uploads = db.psychometricUploads.filter(u=>u.patientId===patientId);
    const rows = [
      {Seccion:'Datos generales', Campo:'Nombre', Valor:patient.name},
      {Seccion:'Datos generales', Campo:'Matrícula', Valor:patient.matricula || ''},
      {Seccion:'Datos generales', Campo:'Carrera', Valor:patient.career || ''},
      {Seccion:'Datos generales', Campo:'Grupo', Valor:patient.group || ''},
      {Seccion:'Datos generales', Campo:'Semestre', Valor:patient.semester || ''},
      {Seccion:'Datos generales', Campo:'Tutor', Valor:patient.tutor || ''},
      {Seccion:'Resumen', Campo:'Citas registradas', Valor:appointments.length},
      {Seccion:'Resumen', Campo:'Tests de preguntas', Valor:tests.length},
      {Seccion:'Resumen', Campo:'Imágenes psicométricas', Valor:uploads.length}
    ];
    exportXls('mi_informacion_salud_mental.xls', rows, ['Seccion','Campo','Valor']);
    logActivity({id:patient.id,name:patient.name,role:'paciente'}, 'Generó un archivo Excel con su información.');
  }

  function exportXls(filename, rows, headers){
    if(!rows || !rows.length){ toast('No hay datos para exportar.', 'error'); return; }
    const cols = headers || Object.keys(rows[0]);
    const table = `<table><thead><tr>${cols.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${cols.map(h=>`<td>${escapeHtml(row[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${table}</body></html>`;
    const blob = new Blob([html], {type:'application/vnd.ms-excel;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast('Archivo de Excel generado.', 'success');
  }
  function pageTitles(){
    return {
      dashboard:'Panel general', usuarios:'Usuarios', citas:'Citas', expedientes:'Expedientes', expediente:'Expediente',
      test:'Test psicológico', platicas:'Pláticas', pacientes:'Mis pacientes', reportes:'Reportes', actividad:'Actividad',
      notificaciones:'Notificaciones', configuracion:'Configuración', qr:'Código QR', lector_qr:'Lector QR'
    };
  }

  function pageDescriptions(){
    return {};
  }

  function mountToastContainer(){
    if(document.querySelector('.toast-wrap')) return;
    const div = document.createElement('div');
    div.className = 'toast-wrap';
    document.body.appendChild(div);
  }

  function toast(message, type='info'){
    const wrap = document.querySelector('.toast-wrap');
    if(!wrap) return;
    const item = document.createElement('div');
    item.className = 'toast ' + type;
    item.textContent = message;
    wrap.appendChild(item);
    setTimeout(() => item.remove(), 3000);
  }
})();

