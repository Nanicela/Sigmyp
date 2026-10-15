export const processGroups = Object.freeze([
  {
    number: '01',
    title: 'Procesos estratégicos y de mejora continua',
    className: 'strategic',
    nodesClass: 'nodes-two',
    processes: [
      { id: 'planeacion', name: 'Gestión de planeación y direccionamiento', href: 'planeacion.html', icon: 'compass' },
      { id: 'mejora-continua', name: 'Gestión de mejora continua', href: 'mejora-continua.html', icon: 'cycle' }
    ]
  },
  {
    number: '02',
    title: 'Procesos misionales',
    className: 'mission',
    nodesClass: 'nodes-four',
    processes: [
      { id: 'comercial', name: 'Gestión comercial', href: 'comercial.html', icon: 'handshake' },
      { id: 'desarrollo', name: 'Gestión de Desarrollo', href: 'desarrollo.html', icon: 'layers' },
      { id: 'compras', name: 'Gestión de Compras', href: 'compras.html', icon: 'bag' },
      { id: 'produccion', name: 'Gestión de Producción', href: 'produccion.html', icon: 'factory' }
    ]
  },
  {
    number: '03',
    title: 'Procesos de apoyo',
    className: 'support',
    nodesClass: 'nodes-three',
    processes: [
      { id: 'talento-humano', name: 'Gestión del Talento Humano', href: 'talento-humano.html', icon: 'people' },
      { id: 'sg-sst', name: 'SG-SST', href: 'sg-sst.html', icon: 'shield' },
      { id: 'financiera', name: 'Gestión Financiera', href: 'financiera.html', icon: 'chart' }
    ]
  }
]);

export const processes = Object.freeze(processGroups.flatMap(group => group.processes));
export const processById = id => processes.find(process => process.id === id) || null;
export const processByFile = file => processes.find(process => process.href === file) || null;
