/*
  Lector QR de asistencia por plática.
  Toma las pláticas desde saludMentalDemoDB_v3 > talks.
  Combina alumnos registrados desde Pláticas + alumnos leídos por QR.
*/

(function () {
  'use strict';

  const APP_KEY = 'saludMentalDemoDB_v3';
  const SESSION_KEY = 'saludMentalSession_v1';
  const ASISTENCIAS_KEY = 'asistencias';
  const THEME_KEY = 'saludMentalTheme';

  let html5QrCode = null;
  let escaneando = false;

  document.addEventListener('DOMContentLoaded', () => {
    aplicarTema();
    validarSesion();
    cargarPlaticas();
    enlazarEventos();
    mostrarResumen();
    iniciarLector();
  });

  function getSession() {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  }

  function getDB() {
    return JSON.parse(localStorage.getItem(APP_KEY) || '{}');
  }

  function saveDB(db) {
    localStorage.setItem(APP_KEY, JSON.stringify(db));
  }

  function obtenerAsistencias() {
    return JSON.parse(localStorage.getItem(ASISTENCIAS_KEY) || '[]');
  }

  function guardarAsistencias(asistencias) {
    localStorage.setItem(ASISTENCIAS_KEY, JSON.stringify(asistencias));
  }

  function aplicarTema() {
    const tema = localStorage.getItem(THEME_KEY) || 'light';
    document.body.classList.toggle('dark-mode', tema === 'dark');
  }

  function validarSesion() {
    const session = getSession();

    if (!session || session.role !== 'psicologo') {
      alert('Acceso no autorizado. Inicia sesión como psicólogo.');
      window.location.href = 'login.html';
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizar(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function formatearFecha(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-MX');
  }

  function cargarPlaticas() {
    const db = getDB();
    const select = document.getElementById('platicaSelect');

    if (!select) return;

    const platicas = db.talks || [];

    if (!platicas.length) {
      select.innerHTML = '<option value="">No hay pláticas creadas</option>';
      return;
    }

    select.innerHTML = `
      <option value="">Seleccione una plática</option>
      ${platicas.map(talk => `
        <option value="${talk.id}">
          ${escapeHtml(talk.title || 'Plática sin nombre')} - ${escapeHtml(talk.date || '')} ${escapeHtml(talk.time || '')}
        </option>
      `).join('')}
    `;

    const ultima = sessionStorage.getItem('lectorQrPlaticaId');

    if (ultima && platicas.some(t => String(t.id) === String(ultima))) {
      select.value = ultima;
    } else {
      select.value = String(platicas[0].id);
      sessionStorage.setItem('lectorQrPlaticaId', select.value);
    }
  }

  function getPlaticaSeleccionada() {
    const db = getDB();
    const select = document.getElementById('platicaSelect');
    const id = Number(select?.value || 0);

    return (db.talks || []).find(talk => Number(talk.id) === id) || null;
  }

  function getUsuarioPorDatos(data) {
    const db = getDB();
    const usuarioId = Number(data.usuarioId || data.pacienteId || 0);
    const email = normalizar(data.correo || data.email);
    const matricula = normalizar(data.matricula);

    return (db.users || []).find(user =>
      Number(user.id) === usuarioId ||
      normalizar(user.email) === email ||
      normalizar(user.matricula) === matricula
    ) || null;
  }

  function crearClaveAlumno(data) {
    return String(
      data.usuarioId ||
      data.pacienteId ||
      data.matricula ||
      data.email ||
      data.correo ||
      data.nombre ||
      ''
    ).toLowerCase();
  }

  function obtenerFilasCombinadas() {
    const db = getDB();
    const platica = getPlaticaSeleccionada();

    if (!platica) return [];

    const asistencias = obtenerAsistencias();

    const asistenciasPlatica = asistencias.filter(item => {
      const mismoId = Number(item.platicaId || 0) === Number(platica.id);
      const mismoNombre = normalizar(item.platica) === normalizar(platica.title);
      return mismoId || mismoNombre;
    });

    const mapa = new Map();

    (platica.registeredUsers || []).forEach(userId => {
      const user = (db.users || []).find(u => Number(u.id) === Number(userId));
      if (!user) return;

      const clave = crearClaveAlumno({
        usuarioId: user.id,
        matricula: user.matricula,
        email: user.email
      });

      mapa.set(clave, {
        pacienteId: user.id,
        nombre: user.name || '',
        correo: user.email || '',
        matricula: user.matricula || '',
        carrera: user.career || '',
        grupo: user.group || '',
        semestre: user.semester || '',
        platicaId: platica.id,
        platica: platica.title || '',
        fechaQR: '',
        registradoPor: '',
        origen: 'Registro en plática'
      });
    });

    asistenciasPlatica.forEach(item => {
      const clave = crearClaveAlumno(item);
      const existente = mapa.get(clave);

      if (existente) {
        existente.fechaQR = item.fecha || '';
        existente.registradoPor = item.registradoPor || '';
        existente.origen = 'Registro + QR';
        return;
      }

      mapa.set(clave, {
        pacienteId: item.pacienteId || item.usuarioId || '',
        nombre: item.nombre || '',
        correo: item.correo || item.email || '',
        matricula: item.matricula || '',
        carrera: item.carrera || '',
        grupo: item.grupo || '',
        semestre: item.semestre || '',
        platicaId: platica.id,
        platica: platica.title || '',
        fechaQR: item.fecha || '',
        registradoPor: item.registradoPor || '',
        origen: 'QR'
      });
    });

    return Array.from(mapa.values());
  }

  function mostrarResumen() {
    const resumen = document.getElementById('resumenAsistencias');
    const platica = getPlaticaSeleccionada();

    if (!resumen) return;

    if (!platica) {
      resumen.innerHTML = `
        <h2>Resumen de asistencias</h2>
        <div class="empty">Selecciona una plática para ver la lista.</div>
      `;
      return;
    }

    const filas = obtenerFilasCombinadas();

    if (!filas.length) {
      resumen.innerHTML = `
        <h2>Resumen de asistencias</h2>
        <p><strong>Plática:</strong> ${escapeHtml(platica.title || '')}</p>
        <p><strong>Total registrado:</strong> 0</p>
        <div class="empty">No hay alumnos registrados ni lecturas QR para esta plática.</div>
      `;
      return;
    }

    resumen.innerHTML = `
      <h2>Resumen de asistencias</h2>
      <p><strong>Plática:</strong> ${escapeHtml(platica.title || '')}</p>
      <p><strong>Total registrado:</strong> ${filas.length}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Alumno</th>
              <th>Matrícula</th>
              <th>Carrera</th>
              <th>Grupo</th>
              <th>Semestre</th>
              <th>Origen</th>
              <th>Fecha QR</th>
            </tr>
          </thead>
          <tbody>
            ${filas.map((row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(row.nombre)}</td>
                <td>${escapeHtml(row.matricula)}</td>
                <td>${escapeHtml(row.carrera)}</td>
                <td>${escapeHtml(row.grupo)}</td>
                <td>${escapeHtml(row.semestre)}</td>
                <td>${escapeHtml(row.origen)}</td>
                <td>${escapeHtml(row.fechaQR ? formatearFecha(row.fechaQR) : 'Sin lectura QR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function validarDatosQR(data) {
    const tipoValido = data && (data.tipo === 'usuario' || data.tipo === 'asistencia');
    const idValido = data && (data.usuarioId || data.pacienteId || data.matricula || data.email || data.correo);

    return Boolean(tipoValido && idValido && data.nombre);
  }

  async function sincronizarAsistencia(asistencia) {
    const config = window.SALUD_MENTAL_CONFIG || {};
    const apiBaseUrl = String(config.apiBaseUrl || '').replace(/\/$/, '');

    if (!apiBaseUrl) return;

    try {
      await fetch(apiBaseUrl + '/api/qr/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asistencia)
      });
    } catch (error) {
      console.warn('No se pudo sincronizar la asistencia QR:', error);
    }
  }

  function registrarAsistencia(data) {
    const session = getSession();
    const db = getDB();
    const platica = getPlaticaSeleccionada();
    const resultado = document.getElementById('resultado');

    if (!platica) {
      resultado.className = 'notice unread';
      resultado.innerHTML = `
        <strong>Selecciona una plática</strong>
        <p>Debes seleccionar una plática antes de leer el QR.</p>
      `;
      iniciarLector();
      return;
    }

    const user = getUsuarioPorDatos(data);
    const usuarioId = user?.id || data.usuarioId || data.pacienteId || '';

    const asistencias = obtenerAsistencias();

    const duplicada = asistencias.some(item => {
      const mismoAlumno =
        String(item.pacienteId || item.usuarioId || item.matricula || item.email || '').toLowerCase() ===
        String(usuarioId || data.matricula || data.email || data.correo || '').toLowerCase();

      const mismaPlatica =
        Number(item.platicaId || 0) === Number(platica.id) ||
        normalizar(item.platica) === normalizar(platica.title);

      return mismoAlumno && mismaPlatica;
    });

    if (duplicada) {
      resultado.className = 'notice unread';
      resultado.innerHTML = `
        <strong>Asistencia duplicada</strong>
        <p>${escapeHtml(data.nombre)} ya tiene lectura QR en esta plática.</p>
      `;
      mostrarResumen();
      return;
    }

    const asistencia = {
      pacienteId: usuarioId,
      usuarioId: usuarioId,
      nombre: user?.name || data.nombre || '',
      correo: user?.email || data.correo || data.email || '',
      email: user?.email || data.email || data.correo || '',
      matricula: user?.matricula || data.matricula || '',
      carrera: user?.career || data.carrera || '',
      grupo: user?.group || data.grupo || '',
      semestre: user?.semester || data.semestre || '',
      tutor: user?.tutor || data.tutor || '',
      platicaId: platica.id,
      platica: platica.title || '',
      fecha: new Date().toISOString(),
      registradoPor: session ? session.name : '',
      registradoPorId: session ? session.id : null
    };

    asistencias.push(asistencia);
    guardarAsistencias(asistencias);

    const talk = (db.talks || []).find(t => Number(t.id) === Number(platica.id));

    if (talk && usuarioId) {
      talk.registeredUsers = talk.registeredUsers || [];

      if (!talk.registeredUsers.map(Number).includes(Number(usuarioId))) {
        talk.registeredUsers.push(Number(usuarioId));
      }

      saveDB(db);
    }

    sincronizarAsistencia(asistencia);
    mostrarResumen();

    resultado.className = 'notice unread';
    resultado.innerHTML = `
      <strong>Asistencia registrada</strong>
      <p>
        Alumno: ${escapeHtml(asistencia.nombre)}<br>
        Matrícula: ${escapeHtml(asistencia.matricula || 'Sin matrícula')}<br>
        Plática: ${escapeHtml(asistencia.platica)}
      </p>
    `;
  }

  function procesarQR(textoQR) {
    const resultado = document.getElementById('resultado');

    try {
      const data = JSON.parse(textoQR);

      if (!validarDatosQR(data)) {
        resultado.className = 'notice unread';
        resultado.innerHTML = `
          <strong>QR inválido</strong>
          <p>El código leído no corresponde a un alumno válido.</p>
        `;
        return;
      }

      registrarAsistencia(data);
    } catch (error) {
      resultado.className = 'notice unread';
      resultado.innerHTML = `
        <strong>Error de lectura</strong>
        <p>No se pudo interpretar la información del código QR.</p>
      `;
    }
  }

  async function detenerLector() {
    if (!html5QrCode || !escaneando) return;

    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (error) {
      console.warn('No se pudo detener el lector QR:', error);
    } finally {
      escaneando = false;
    }
  }

  async function iniciarLector() {
    const lector = document.getElementById('reader');
    const resultado = document.getElementById('resultado');

    if (!lector || typeof Html5Qrcode === 'undefined') {
      resultado.className = 'notice unread';
      resultado.innerHTML = `
        <strong>Error</strong>
        <p>No se cargó la librería para leer códigos QR.</p>
      `;
      return;
    }

    await detenerLector();

    lector.innerHTML = '';
    html5QrCode = new Html5Qrcode('reader');

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async textoQR => {
          await detenerLector();
          procesarQR(textoQR);
        }
      );

      escaneando = true;

      if (resultado.classList.contains('empty')) {
        resultado.textContent = 'Esperando lectura del código QR.';
      }
    } catch (error) {
      escaneando = false;
      resultado.className = 'notice unread';
      resultado.innerHTML = `
        <strong>Error al abrir cámara</strong>
        <p>Revisa permisos del navegador o abre el sistema desde localhost.</p>
      `;
    }
  }

  function limpiarLecturasQR() {
    const platica = getPlaticaSeleccionada();

    if (!platica) {
      alert('Selecciona una plática.');
      return;
    }

    const confirmar = confirm('¿Deseas limpiar solo las lecturas QR de esta plática? Los registros hechos desde Pláticas se conservan.');

    if (!confirmar) return;

    const asistencias = obtenerAsistencias();

    const filtradas = asistencias.filter(item => {
      const mismaPlatica =
        Number(item.platicaId || 0) === Number(platica.id) ||
        normalizar(item.platica) === normalizar(platica.title);

      return !mismaPlatica;
    });

    guardarAsistencias(filtradas);
    mostrarResumen();

    const resultado = document.getElementById('resultado');
    resultado.className = 'empty';
    resultado.textContent = 'Lecturas QR limpiadas para la plática seleccionada.';
  }

  function exportarExcel() {
    const platica = getPlaticaSeleccionada();

    if (!platica) {
      alert('Selecciona una plática antes de exportar.');
      return;
    }

    const filas = obtenerFilasCombinadas();

    if (!filas.length) {
      alert('No hay datos para exportar.');
      return;
    }

    const rows = filas.map((row, index) => ({
      ID: index + 1,
      Alumno: row.nombre,
      Correo: row.correo,
      Matricula: row.matricula,
      Carrera: row.carrera,
      Grupo: row.grupo,
      Semestre: row.semestre,
      Platica: row.platica,
      Origen: row.origen,
      FechaQR: row.fechaQR ? formatearFecha(row.fechaQR) : '',
      RegistradoPor: row.registradoPor || ''
    }));

    exportXls(
      `asistencia_${normalizar(platica.title).replace(/\s+/g, '_') || 'platica'}.xls`,
      rows,
      ['ID', 'Alumno', 'Correo', 'Matricula', 'Carrera', 'Grupo', 'Semestre', 'Platica', 'Origen', 'FechaQR', 'RegistradoPor']
    );
  }

  function exportXls(filename, rows, headers) {
    const table = `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>${headers.map(h => `<td>${escapeHtml(row[h] ?? '')}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body>${table}</body>
      </html>
    `;

    const blob = new Blob([html], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function enlazarEventos() {
    const select = document.getElementById('platicaSelect');
    const btnLeerOtro = document.getElementById('btnLeerOtro');
    const btnLimpiar = document.getElementById('btnLimpiarLecturas');
    const btnExcel = document.getElementById('btnExportarExcel');

    select?.addEventListener('change', () => {
      sessionStorage.setItem('lectorQrPlaticaId', select.value);
      mostrarResumen();
    });

    btnLeerOtro?.addEventListener('click', () => {
      const resultado = document.getElementById('resultado');
      resultado.className = 'empty';
      resultado.textContent = 'Esperando lectura del código QR.';
      iniciarLector();
    });

    btnLimpiar?.addEventListener('click', limpiarLecturasQR);
    btnExcel?.addEventListener('click', exportarExcel);
  }
})();