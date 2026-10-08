export function setupSidebar() {
  const button = document.querySelector('#sidebar-toggle');
  if (!button) return;
  let collapsed = false;
  try { collapsed = localStorage.getItem('sidebar-collapsed') === 'true'; } catch {}
  const links = [...document.querySelectorAll('[data-route]')];
  for (const link of links) {
    const label = link.textContent.trim();
    link.setAttribute('aria-label',label); link.title = label;
  }
  function render() {
    document.body.classList.toggle('sidebar-collapsed',collapsed);
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',collapsed?'Expandir menú':'Minimizar menú');
    button.title = collapsed?'Expandir menú':'Minimizar menú';
  }
  function setCollapsed(value,{persist=false}={}) {
    collapsed=Boolean(value);render();
    if(persist)try { localStorage.setItem('sidebar-collapsed',String(collapsed)); } catch {}
  }
  button.onclick = () => setCollapsed(!collapsed,{persist:true});
  render();
  return {setCollapsed};
}
