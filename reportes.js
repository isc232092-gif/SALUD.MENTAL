document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('#tablaAsistencias tbody');
  if (!tbody) return;

  const asistencias = JSON.parse(localStorage.getItem('asistencias') || '[]');

  if (asistencias.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay asistencias registradas</td></tr>';
    return;
  }

  tbody.innerHTML = asistencias.map(a => `
    <tr>
      <td>${a.pacienteId || ''}</td>
      <td>${a.nombre || ''}</td>
      <td>${a.matricula || ''}</td>
      <td>${a.carrera || ''}</td>
      <td>${a.grupo || ''}</td>
      <td>${a.platica || ''}</td>
      <td>${new Date(a.fecha).toLocaleString()}</td>
      <td>${a.registradoPor || ''}</td>
    </tr>
  `).join('');
});
