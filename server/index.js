const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { getPool } = require('./db');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(ROOT));

function toIsoDate(value){
  if(!value) return '';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0,10);
}

function toTime(value){
  if(!value) return '';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  return d.toTimeString().slice(0,5);
}

function toDateTime(date, time){
  return `${date || '1900-01-01'}T${time || '00:00'}:00`;
}

function roleToId(role){
  const map = { admin:1, psicologo:2, paciente:3 };
  return map[String(role || '').toLowerCase()] || 3;
}

function idToRole(nombre){
  const value = String(nombre || '').toLowerCase();
  if(value.includes('admin')) return 'admin';
  if(value.includes('psic')) return 'psicologo';
  return 'paciente';
}

async function loadBootstrapDb(){
  const pool = await getPool();

  const [settingsRs, usersRs, citasRs, expedientesRs, notasRs, plantillasRs, preguntasRs, testsRs, respuestasRs, platicasRs, inscripcionesRs, notificacionesRs, actividadesRs] = await Promise.all([
    pool.query('SELECT institucion, fecha_actualizacion FROM configuracion_sistema ORDER BY configuracion_id DESC LIMIT 1'),
    pool.query(`
      SELECT u.usuario_id, r.nombre_rol, u.nombre, u.email, u.activo, u.telefono, u.carrera, u.matricula, u.edad, u.tutor, u.grupo, u.semestre, u.especialidad
      FROM usuarios u
      INNER JOIN roles r ON r.rol_id = u.rol_id
      ORDER BY u.usuario_id`),
    pool.query('SELECT cita_id, paciente_id, psicologo_id, fecha_cita, tipo, estado, notas, fecha_creacion FROM citas ORDER BY fecha_cita DESC'),
    pool.query('SELECT expediente_id, paciente_id, edad, antecedentes, diagnostico, tratamiento FROM expedientes'),
    pool.query('SELECT n.nota_id, n.expediente_id, n.nota, n.fecha_registro FROM expediente_notas n ORDER BY n.nota_id'),
    pool.query('SELECT plantilla_id, nombre, creado_por, activo FROM test_plantillas ORDER BY plantilla_id'),
    pool.query('SELECT pregunta_id, plantilla_id, numero, pregunta, activa FROM test_preguntas ORDER BY plantilla_id, numero'),
    pool.query('SELECT aplicacion_id, plantilla_id, paciente_id, fecha_aplicacion, estado, total, riesgo_orientativo, analisis_psicologo, revisado_por FROM test_aplicaciones ORDER BY aplicacion_id'),
    pool.query('SELECT r.aplicacion_id, p.numero, r.valor FROM test_respuestas r INNER JOIN test_preguntas p ON p.pregunta_id = r.pregunta_id ORDER BY r.aplicacion_id, p.numero'),
    pool.query('SELECT platica_id, titulo, ponente, fecha_platica, capacidad, descripcion, activa FROM platicas ORDER BY fecha_platica DESC'),
    pool.query('SELECT platica_id, usuario_id FROM platica_inscripciones'),
    pool.query('SELECT notificacion_id, usuario_id, titulo, mensaje, fecha_registro, leida FROM notificaciones ORDER BY notificacion_id DESC'),
    pool.query('SELECT actividad_id, usuario_id, nombre_usuario, rol, accion, fecha_registro FROM actividades ORDER BY actividad_id DESC')
  ]);

  const settingsRow = settingsRs.rows[0];
  const settings = {
    institution: settingsRow ? settingsRow.institucion : 'Sistema Integral de Atención Psicológica',
    lastReset: settingsRow ? new Date(settingsRow.fecha_actualizacion).toISOString() : new Date().toISOString()
  };

  const users = usersRs.rows.map(u => ({
    id: u.usuario_id,
    name: u.nombre,
    email: u.email,
    password: '',
    role: idToRole(u.nombre_rol),
    active: Boolean(u.activo),
    phone: u.telefono || '',
    career: u.carrera || '',
    matricula: u.matricula || '',
    age: u.edad || '',
    tutor: u.tutor || '',
    group: u.grupo || '',
    semester: u.semestre ? String(u.semestre) : '',
    specialty: u.especialidad || ''
  }));

  const appointments = citasRs.rows.map(c => ({
    id: c.cita_id,
    patientId: c.paciente_id,
    psychologistId: c.psicologo_id,
    date: toIsoDate(c.fecha_cita),
    time: toTime(c.fecha_cita),
    type: c.tipo,
    status: c.estado,
    notes: c.notas || '',
    createdAt: c.fecha_creacion ? new Date(c.fecha_creacion).toISOString() : new Date().toISOString()
  }));

  const notesByExpediente = new Map();
  notasRs.rows.forEach(n => {
    if(!notesByExpediente.has(n.expediente_id)) notesByExpediente.set(n.expediente_id, []);
    notesByExpediente.get(n.expediente_id).push(n.nota);
  });

  const records = expedientesRs.rows.map(e => ({
    patientId: e.paciente_id,
    age: e.edad || 0,
    background: e.antecedentes || '',
    diagnosis: e.diagnostico || '',
    treatment: e.tratamiento || '',
    notes: notesByExpediente.get(e.expediente_id) || []
  }));

  const questionsByTemplate = new Map();
  preguntasRs.rows.forEach(p => {
    if(!questionsByTemplate.has(p.plantilla_id)) questionsByTemplate.set(p.plantilla_id, []);
    questionsByTemplate.get(p.plantilla_id).push(p.pregunta);
  });

  const testTemplates = plantillasRs.rows.map(t => ({
    id: t.plantilla_id,
    name: t.nombre,
    createdBy: t.creado_por,
    active: Boolean(t.activo),
    questions: questionsByTemplate.get(t.plantilla_id) || []
  }));

  const answersByTest = new Map();
  respuestasRs.rows.forEach(r => {
    if(!answersByTest.has(r.aplicacion_id)) answersByTest.set(r.aplicacion_id, []);
    answersByTest.get(r.aplicacion_id).push(r.valor);
  });

  const templateName = new Map(testTemplates.map(t => [t.id, t.name]));
  const tests = testsRs.rows.map(t => ({
    id: t.aplicacion_id,
    templateId: t.plantilla_id,
    templateName: templateName.get(t.plantilla_id) || 'Cuestionario',
    patientId: t.paciente_id,
    date: toIsoDate(t.fecha_aplicacion),
    time: toTime(t.fecha_aplicacion),
    answers: answersByTest.get(t.aplicacion_id) || [],
    status: t.estado,
    total: t.total,
    risk: t.riesgo_orientativo || '',
    analysis: t.analisis_psicologo || '',
    reviewedBy: t.revisado_por || null
  }));

  const registeredByTalk = new Map();
  inscripcionesRs.rows.forEach(i => {
    if(!registeredByTalk.has(i.platica_id)) registeredByTalk.set(i.platica_id, []);
    registeredByTalk.get(i.platica_id).push(i.usuario_id);
  });

  const talks = platicasRs.rows.map(t => ({
    id: t.platica_id,
    title: t.titulo,
    speaker: t.ponente,
    date: toIsoDate(t.fecha_platica),
    time: toTime(t.fecha_platica),
    capacity: t.capacidad,
    description: t.descripcion || '',
    registeredUsers: registeredByTalk.get(t.platica_id) || []
  }));

  const notifications = notificacionesRs.rows.map(n => ({
    id: n.notificacion_id,
    userId: n.usuario_id,
    title: n.titulo,
    message: n.mensaje,
    date: n.fecha_registro ? new Date(n.fecha_registro).toISOString() : new Date().toISOString(),
    read: Boolean(n.leida)
  }));

  const activities = actividadesRs.rows.map(a => ({
    id: a.actividad_id,
    userId: a.usuario_id,
    userName: a.nombre_usuario || '',
    role: a.rol || '',
    action: a.accion,
    date: a.fecha_registro ? new Date(a.fecha_registro).toISOString() : new Date().toISOString()
  }));

  return {
    settings,
    users,
    appointments,
    records,
    testTemplates,
    tests,
    psychometricUploads: [],
    talks,
    notifications,
    activities,
    apiMessages: []
  };
}

async function upsertUser(client, user){
  const hasPassword = Boolean(user.password);
  const passwordHashBuffer = hasPassword 
    ? crypto.createHash('sha256').update(user.password).digest()
    : crypto.createHash('sha256').update('Temporal2026@').digest();

  await client.query(`
    INSERT INTO usuarios (usuario_id, rol_id, nombre, email, password_hash, activo, telefono, carrera, matricula, edad, tutor, grupo, semestre, especialidad)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (usuario_id) DO UPDATE
    SET rol_id = EXCLUDED.rol_id,
        nombre = EXCLUDED.nombre,
        email = EXCLUDED.email,
        password_hash = CASE WHEN $15 = true THEN EXCLUDED.password_hash ELSE usuarios.password_hash END,
        activo = EXCLUDED.activo,
        telefono = EXCLUDED.telefono,
        carrera = EXCLUDED.carrera,
        matricula = EXCLUDED.matricula,
        edad = EXCLUDED.edad,
        tutor = EXCLUDED.tutor,
        grupo = EXCLUDED.grupo,
        semestre = EXCLUDED.semestre,
        especialidad = EXCLUDED.especialidad;
  `, [
    Number(user.id),
    roleToId(user.role),
    user.name || 'Sin nombre',
    user.email || `usuario${user.id}@salud.local`,
    passwordHashBuffer,
    user.active !== false,
    user.phone || null,
    user.career || null,
    user.matricula || null,
    user.age ? Number(user.age) : null,
    user.tutor || null,
    user.group || null,
    user.semester ? Number(user.semester) : null,
    user.specialty || null,
    hasPassword
  ]);
}

async function upsertAppointment(client, appointment){
  await client.query(`
    INSERT INTO citas (cita_id, paciente_id, psicologo_id, fecha_cita, tipo, estado, notas)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (cita_id) DO UPDATE
    SET paciente_id = EXCLUDED.paciente_id,
        psicologo_id = EXCLUDED.psicologo_id,
        fecha_cita = EXCLUDED.fecha_cita,
        tipo = EXCLUDED.tipo,
        estado = EXCLUDED.estado,
        notes = EXCLUDED.notas;
  `, [
    Number(appointment.id),
    Number(appointment.patientId),
    Number(appointment.psychologistId),
    new Date(toDateTime(appointment.date, appointment.time)),
    appointment.type || 'Primera vez',
    appointment.status || 'Pendiente',
    appointment.notes || null
  ]).catch(err => {
    // Si la columna notas se mapea como notes en el EXCLUDED por un error de tipeo en el SQL Server origen, lo toleramos
    return client.query(`
      INSERT INTO citas (cita_id, paciente_id, psicologo_id, fecha_cita, tipo, estado, notas)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (cita_id) DO UPDATE
      SET paciente_id = EXCLUDED.paciente_id,
          psicologo_id = EXCLUDED.psicologo_id,
          fecha_cita = EXCLUDED.fecha_cita,
          tipo = EXCLUDED.tipo,
          estado = EXCLUDED.estado,
          notas = EXCLUDED.notas;
    `, [
      Number(appointment.id),
      Number(appointment.patientId),
      Number(appointment.psychologistId),
      new Date(toDateTime(appointment.date, appointment.time)),
      appointment.type || 'Primera vez',
      appointment.status || 'Pendiente',
      appointment.notes || null
    ]);
  });
}

async function upsertRecord(client, record){
  await client.query(`
    INSERT INTO expedientes (paciente_id, edad, antecedentes, diagnostico, tratamiento)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (paciente_id) DO UPDATE
    SET edad = EXCLUDED.edad,
        antecedentes = EXCLUDED.antecedentes,
        diagnostico = EXCLUDED.diagnostico,
        tratamiento = EXCLUDED.tratamiento,
        fecha_actualizacion = CURRENT_TIMESTAMP;
  `, [
    Number(record.patientId),
    record.age ? Number(record.age) : null,
    record.background || null,
    record.diagnosis || null,
    record.treatment || null
  ]);

  const expedienteRs = await client.query('SELECT expediente_id FROM expedientes WHERE paciente_id = $1', [Number(record.patientId)]);
  const expedienteId = expedienteRs.rows[0]?.expediente_id;
  if(!expedienteId) return;

  await client.query('DELETE FROM expediente_notas WHERE expediente_id = $1', [expedienteId]);
  for(const note of (record.notes || [])){
    await client.query('INSERT INTO expediente_notas (expediente_id, nota) VALUES ($1, $2)', [expedienteId, String(note || '')]);
  }
}

async function upsertTalk(client, talk){
  await client.query(`
    INSERT INTO platicas (platica_id, titulo, ponente, fecha_platica, capacidad, descripcion)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (platica_id) DO UPDATE
    SET titulo = EXCLUDED.titulo,
        ponente = EXCLUDED.ponente,
        fecha_platica = EXCLUDED.fecha_platica,
        capacidad = EXCLUDED.capacidad,
        descripcion = EXCLUDED.descripcion;
  `, [
    Number(talk.id),
    talk.title || 'Plática',
    talk.speaker || 'Psicología',
    new Date(toDateTime(talk.date, talk.time)),
    Number(talk.capacity || 1),
    talk.description || null
  ]);

  await client.query('DELETE FROM platica_inscripciones WHERE platica_id = $1', [Number(talk.id)]);
  for(const userId of (talk.registeredUsers || [])){
    await client.query(`
      INSERT INTO platica_inscripciones (platica_id, usuario_id)
      SELECT $1, $2
      WHERE EXISTS(SELECT 1 FROM usuarios WHERE usuario_id = $2)
      ON CONFLICT (platica_id, usuario_id) DO NOTHING;
    `, [Number(talk.id), Number(userId)]);
  }
}

async function upsertNotification(client, n){
  await client.query(`
    INSERT INTO notificaciones (notificacion_id, usuario_id, titulo, mensaje, leida)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (notificacion_id) DO UPDATE
    SET usuario_id = EXCLUDED.usuario_id,
        titulo = EXCLUDED.titulo,
        mensaje = EXCLUDED.mensaje,
        leida = EXCLUDED.leida;
  `, [
    Number(n.id),
    Number(n.userId),
    n.title || 'Notificación',
    n.message || '',
    Boolean(n.read)
  ]);
}

async function upsertActivity(client, a){
  await client.query(`
    INSERT INTO actividades (actividad_id, usuario_id, nombre_usuario, rol, accion)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (actividad_id) DO NOTHING;
  `, [
    Number(a.id),
    a.userId ? Number(a.userId) : null,
    a.userName || null,
    a.role || null,
    a.action || 'Actividad'
  ]);
}

async function syncFullDb(db){
  const pool = await getPool();
  const client = await pool.connect();
  try{
    await client.query('BEGIN');
    for(const user of (db.users || [])) await upsertUser(client, user);
    for(const record of (db.records || [])) await upsertRecord(client, record);
    for(const appointment of (db.appointments || [])) await upsertAppointment(client, appointment);
    for(const talk of (db.talks || [])) await upsertTalk(client, talk);
    for(const n of (db.notifications || [])) await upsertNotification(client, n);
    for(const a of (db.activities || [])) await upsertActivity(client, a);
    await client.query('COMMIT');
  }catch(error){
    await client.query('ROLLBACK');
    throw error;
  }finally{
    client.release();
  }
}

app.get('/api/health', async (_req, res) => {
  try{
    const pool = await getPool();
    await pool.query('SELECT 1 AS ok');
    res.json({ ok:true, database: 'PostgreSQL/Supabase' });
  }catch(error){
    res.status(500).json({ ok:false, message:error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if(!email || !password) return res.status(400).json({ message:'Correo y contraseña son obligatorios.' });
  try{
    const pool = await getPool();
    const result = await pool.query(`
      SELECT u.usuario_id, u.nombre, u.email, r.nombre_rol, u.activo, u.telefono, u.carrera, u.matricula, u.edad, u.tutor, u.grupo, u.semestre, u.especialidad
      FROM usuarios u
      INNER JOIN roles r ON r.rol_id = u.rol_id
      WHERE LOWER(u.email)=$1 AND u.password_hash = $2 AND u.activo=true
      LIMIT 1;
    `, [
      String(email).trim().toLowerCase(),
      crypto.createHash('sha256').update(String(password)).digest()
    ]);
    const u = result.rows[0];
    if(!u) return res.status(401).json({ message:'Credenciales inválidas o cuenta inactiva.' });
    res.json({
      user:{
        id:u.usuario_id,
        name:u.nombre,
        email:u.email,
        role:idToRole(u.nombre_rol),
        active:Boolean(u.activo),
        phone:u.telefono || '',
        career:u.carrera || '',
        matricula:u.matricula || '',
        age:u.edad || '',
        tutor:u.tutor || '',
        group:u.grupo || '',
        semester:u.semestre ? String(u.semestre) : '',
        specialty:u.especialidad || ''
      }
    });
  }catch(error){
    res.status(500).json({ message:error.message });
  }
});

app.get('/api/bootstrap', async (_req, res) => {
  try{
    const db = await loadBootstrapDb();
    res.json({ db });
  }catch(error){
    res.status(500).json({ message:error.message });
  }
});

app.post('/api/sync/full', async (req, res) => {
  try{
    if(!req.body || !req.body.db) return res.status(400).json({ message:'No se recibió la base local para sincronizar.' });
    await syncFullDb(req.body.db);
    res.json({ ok:true });
  }catch(error){
    res.status(500).json({ ok:false, message:error.message });
  }
});

app.post('/api/qr/asistencia', async (req, res) => {
  const body = req.body || {};
  try{
    const pool = await getPool();
    await pool.query(`
      INSERT INTO asistencias_qr (usuario_id, platica_manual, qr_contenido, registrado_por)
      SELECT $1, $2, $3, $4
      WHERE EXISTS(SELECT 1 FROM usuarios WHERE usuario_id = $1);
    `, [
      Number(body.usuarioId || body.pacienteId),
      body.platica || null,
      JSON.stringify(body),
      body.registradoPorId ? Number(body.registradoPorId) : null
    ]);
    res.json({ ok:true });
  }catch(error){
    res.status(500).json({ ok:false, message:error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(ROOT, 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Sistema Salud Mental listo en http://localhost:${PORT}`);
});
