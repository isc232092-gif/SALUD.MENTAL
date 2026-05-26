/*
  Configuración de conexión para Antigravity/API.
  - Si el sistema se sirve desde el backend Node, usa el mismo origen: http://localhost:3000
  - Si se abre como archivo local, desactiva la API y el sistema conserva localStorage.
*/
window.SALUD_MENTAL_CONFIG = {
  apiBaseUrl: window.location.protocol === 'file:' ? '' : window.location.origin
};
