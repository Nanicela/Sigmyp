export const MODULE_STATUS = Object.freeze({
  ACTIVE: 'active',
  MIGRATING: 'migrating',
  PLANNED: 'planned',
  FINAL_STAGE: 'final-stage'
});

export const moduleCatalog = Object.freeze([
  { id: 'processes', label: 'Mapa de procesos', order: 0, status: MODULE_STATUS.ACTIVE, route: 'procesos', processIds: [], permissions: ['processes.read'] },
  { id: 'company', label: 'Datos de empresa', order: 0, status: MODULE_STATUS.ACTIVE, route: 'empresa', processIds: ['planeacion'], permissions: ['company.read', 'company.update'] },
  { id: 'access', label: 'Usuarios y permisos', order: 0, status: MODULE_STATUS.MIGRATING, route: 'usuarios', processIds: ['planeacion'], permissions: ['access.read', 'access.manage'] },
  { id: 'crm', label: 'Clientes, contactos y sedes', order: 1, status: MODULE_STATUS.MIGRATING, route: 'clientes', processIds: ['comercial'], permissions: ['customers.read', 'customers.manage'] },
  { id: 'sales', label: 'Cotizaciones', order: 2, status: MODULE_STATUS.PLANNED, route: 'cotizaciones', processIds: ['comercial'], permissions: ['quotations.read', 'quotations.manage', 'quotations.approve'] },
  { id: 'purchases', label: 'Compras y proveedores', order: 3, status: MODULE_STATUS.PLANNED, route: 'compras', processIds: ['compras'], permissions: ['purchases.read', 'purchases.manage', 'purchases.approve'] },
  { id: 'inventory', label: 'Inventario', order: 4, status: MODULE_STATUS.PLANNED, route: 'inventario', processIds: ['compras', 'produccion'], permissions: ['inventory.read', 'inventory.move', 'inventory.adjust'] },
  { id: 'production', label: 'Productos y producción', order: 5, status: MODULE_STATUS.PLANNED, route: 'produccion', processIds: ['desarrollo', 'produccion'], permissions: ['production.read', 'production.manage', 'production.complete'] },
  { id: 'support', label: 'Soporte y activos', order: 6, status: MODULE_STATUS.PLANNED, route: 'soporte', processIds: ['comercial', 'sg-sst'], permissions: ['support.read', 'support.manage', 'support.assign'] },
  { id: 'finance', label: 'Finanzas, pagos y cartera', order: 7, status: MODULE_STATUS.PLANNED, route: 'finanzas', processIds: ['financiera'], permissions: ['finance.read', 'payments.manage', 'payments.reverse'] },
  { id: 'analytics', label: 'Indicadores', order: 8, status: MODULE_STATUS.PLANNED, route: 'indicadores', processIds: ['mejora-continua'], permissions: ['analytics.read'] },
  { id: 'dian', label: 'Integración DIAN', order: 9, status: MODULE_STATUS.FINAL_STAGE, route: 'dian', processIds: ['financiera'], permissions: ['dian.read', 'dian.manage'] }
]);

export const moduleById = id => moduleCatalog.find(module => module.id === id) || null;
export const modulesForProcess = (processId, { includePlanned = false } = {}) => moduleCatalog
  .filter(module => module.processIds.includes(processId))
  .filter(module => includePlanned || [MODULE_STATUS.ACTIVE, MODULE_STATUS.MIGRATING].includes(module.status))
  .sort((left, right) => left.order - right.order);

// Las vistas comerciales comparten el directorio de la compañía activa.
export const workspaceTabsForProcess = processId => processId === 'comercial'
  ? [
    { id: 'accounts', label: 'Cuentas', dataModule: 'crm', route: 'clientes' },
    { id: 'contacts', label: 'Contactos', dataModule: 'crm', route: 'clientes' },
    { id: 'offices', label: 'Oficinas', dataModule: 'crm', route: 'clientes' },
    { id: 'quotations', label: 'Cotizaciones', dataModule: 'sales', pending: true }
  ]
  : processId === 'compras'
  ? [
    { id: 'suppliers', label: 'Proveedores', dataModule: 'purchases', columns: ['NIT', 'Nombre', 'Teléfono', 'Email', 'Ciudad', 'Estado', 'Acciones'] },
    { id: 'supplierContacts', label: 'Contactos', dataModule: 'purchases', columns: ['Nombre', 'Proveedor', 'Cargo', 'Teléfono', 'Email', 'Acciones'] },
    { id: 'purchaseOrders', label: 'Órdenes de compra', dataModule: 'purchases', columns: ['Número', 'Proveedor', 'Estado', 'Creación', 'Fecha esperada', 'Usuario que aprueba', 'Total', 'Comentarios', 'Acciones'] },
    { id: 'items', label: 'Ítems', dataModule: 'purchases', columns: ['Código', 'Nombre', 'Unidad', 'Estado', 'Acciones'] },
    { id: 'kardex', label: 'Kárdex', dataModule: 'purchases', columns: ['Fecha', 'Ítem', 'Movimiento', 'Entrada', 'Salida', 'Saldo', 'Documento', 'Acciones'] }
  ]
  : processId === 'produccion'
  ? [{id:'products',label:'Productos',dataModule:'production'},{id:'productionOrders',label:'Órdenes de producción',dataModule:'production'},{id:'referrals',label:'Remisiones',dataModule:'production'},{id:'processes',label:'Procesos',dataModule:'production'}]
  : modulesForProcess(processId).map(module => ({ ...module, dataModule: module.id }));
