import { isDydCompany } from './process-access.js';

const views = {
  productos: ['Productos y servicios', 'Administra el catálogo de la compañía activa.'],
  acceso: ['Tu compañía', 'Estamos comprobando tu acceso…'],
  companias: ['Compañías', 'Elige una compañía para acceder a sus módulos.'],
  usuarios: ['Usuarios y permisos', 'Asigna accesos únicamente a la empresa seleccionada.'],
  nuevo: ['Nuevo documento de facturación', 'Prepara una factura o una nota para la empresa activa.'],
  documentos: ['Facturación', 'Consulta los borradores y revisa sus importes.'],
  registrar: ['Registrar empresa', 'Añade una empresa a tu espacio de trabajo.'],
  empresa: ['Datos de empresa', 'Administra la identificación, el contacto y los datos tributarios.'],
  clientes: ['Clientes', 'Organiza el directorio de compradores de la empresa activa.'],
  procesos: ['Mapa de procesos', 'Consulta la estructura y caracterización de los procesos de DyD.']
};
export function setupNavigation() {
  let signedIn = false, spark = false, admin = false, role = null, companyStatus='loading';
  const buttons = [...document.querySelectorAll('[data-route]')];
  const paused = new Set(['documentos','nuevo','productos']);
  const backToProcesses = document.querySelector('#back-to-processes');
  function dydIsActive() {
    const select = document.querySelector('#company');
    return isDydCompany(select.value);
  }
  function available(key) { return signedIn && !paused.has(key) && (key === 'procesos' ? dydIsActive() : key === 'companias' ? admin : key === 'registrar' ? admin : !document.querySelector('#company').value ? false : key === 'usuarios' ? ['platform','admin'].includes(role) : ['empresa','clientes'].includes(key) ? spark && !!role : false); }
  function render() {
    const requested = location.hash.slice(1);
    const activeCompany=document.querySelector('#company').value;
    const route = available(requested) && views[requested] ? requested : activeCompany ? (dydIsActive()?'procesos':'empresa') : admin ? 'companias' : 'acceso';
    if(signedIn&&requested!==route)history.replaceState(null,'',`#${route}`);
    const processAllowed = signedIn && dydIsActive();
    backToProcesses.hidden = !processAllowed || !['empresa','usuarios'].includes(route);
    document.documentElement.dataset.authenticated = signedIn ? 'true' : 'false';
    document.documentElement.dataset.processesAllowed = processAllowed ? 'true' : 'false';
    document.body.dataset.screen = route;
    document.querySelector('[data-view="companias"]').hidden=!admin;
    const statusText={loading:'Estamos comprobando tu acceso…',empty:'No tienes una compañía asignada. Solicita acceso a la superadministradora.',conflict:'Tu usuario tiene más de una compañía asignada. Solicita a la superadministradora que revise tu acceso.',error:'No pudimos cargar tu compañía. Recarga la página para volver a intentarlo.'};
    views.acceso[1]=statusText[companyStatus]||statusText.loading;
    document.querySelector('#company-access-status').textContent=views.acceso[1];

    const select = document.querySelector('#company');
    const active = !!select.value;
    document.querySelector('#company-subnav').hidden = !active || route === 'companias';
    document.querySelector('#nav-company-name').textContent = active ? select.selectedOptions[0].textContent : '';
    document.querySelector('#active-company-banner').hidden = !active || ['companias','registrar','procesos'].includes(route);
    document.querySelector('#active-company-name').textContent = active ? select.selectedOptions[0].textContent : '';

    document.querySelector('#view-title').textContent = signedIn ? views[route][0] : 'Tu gestión, en un solo lugar.';
    document.querySelector('#view-description').textContent = signedIn ? views[route][1] : 'Inicia sesión para acceder a tus empresas y módulos.';
    const processFrame = document.querySelector('#process-map-frame');
    if (processAllowed && route === 'procesos' && !processFrame.getAttribute('src')) processFrame.src = processFrame.dataset.src;
    if (!processAllowed) processFrame.removeAttribute('src');
    for (const b of buttons) {
      b.disabled = !available(b.dataset.route); b.hidden = signedIn && !available(b.dataset.route);
      if (signedIn && b.dataset.route === route) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    }
    document.querySelector('#view-empty').hidden = !signedIn || !['empresa','clientes'].includes(route) || !!document.querySelector('#company').value;
    const panel = document.querySelector(`[data-view="${route}"]`);
    if (panel?.tagName === 'DETAILS') panel.open = true;
    if (route === 'registrar') document.querySelector('#company-panel').open = true;
  }
  for (const b of buttons) b.onclick = () => { if(b.dataset.route==='nuevo'){document.querySelector('#open-document').click();return;}if(b.dataset.route==='registrar'){document.querySelector('#open-company').click();return;}location.hash = b.dataset.route; render(); };
  backToProcesses.onclick = () => { location.hash = 'procesos'; render(); };
  window.addEventListener('hashchange',render);
  document.querySelector('#company').addEventListener('change',render);
  new MutationObserver(render).observe(document.querySelector('#profiles'),{attributes:true,attributeFilter:['hidden']});
  render();
  return { update(state) { ({signedIn,spark,admin,role} = state); companyStatus=state.companyStatus??companyStatus; render(); } };
}
