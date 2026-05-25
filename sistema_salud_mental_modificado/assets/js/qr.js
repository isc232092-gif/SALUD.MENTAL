/*
  Módulo QR del estudiante.
  Genera un código QR con los datos principales del alumno.
  Compatible con el lector QR de asistencia por plática manual.
*/

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnQR') || document.getElementById('btnGenerarQR');
  const container = document.getElementById('qr') || document.getElementById('qrContainer');

  const SESSION_KEY = 'saludMentalSession_v1';
  const APP_KEY = 'saludMentalDemoDB_v3';

  if (!btn || !container) {
    console.warn('No se encontraron los elementos necesarios para generar el QR del estudiante.');
    return;
  }

  btn.addEventListener('click', () => {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    const db = JSON.parse(localStorage.getItem(APP_KEY) || '{}');

    if (!session) {
      alert('No hay sesión activa. Inicia sesión como estudiante.');
      return;
    }

    if (session.role !== 'paciente') {
      alert('Solo el estudiante puede generar su código QR.');
      return;
    }

    const student = (db.users || []).find(user => user.id === session.id);

    if (!student) {
      alert('No se encontró la información del estudiante.');
      return;
    }

    const data = {
      tipo: 'usuario',
      usuarioId: student.id,
      nombre: student.name || '',
      correo: student.email || '',
      email: student.email || '',
      matricula: student.matricula || '',
      carrera: student.career || '',
      grupo: student.group || '',
      semestre: student.semester || '',
      tutor: student.tutor || '',
      fechaGeneracion: new Date().toISOString()
    };

    container.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: JSON.stringify(data),
        width: 250,
        height: 250
      });
    } else {
      container.textContent = JSON.stringify(data);
    }
  });
});
