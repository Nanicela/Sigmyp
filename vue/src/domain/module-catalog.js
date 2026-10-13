export const MODULE_STATUS = Object.freeze({
  ACTIVE: 'active',
  MIGRATING: 'migrating',
  PLANNED: 'planned',
  FINAL_STAGE: 'final-stage'
});

export const moduleCatalog = Object.freeze([
  { id: 'processes', label: 'Mapa de procesos', order: 0, status: MODULE_STATUS.ACTIVE, permissions: ['processes.read'] },
  { id: 'company', label: 'Datos de empresa', order: 0, status: MODULE_STATUS.ACTIVE, permissions: ['company.read', 'company.update'] },
  { id: 'access', label: 'Usuarios y permisos', order: 0, status: MODULE_STATUS.MIGRATING, permissions: ['access.read', 'access.manage'] },
  { id: 'crm', label: 'Clientes, contactos y sedes', order: 1, status: MODULE_STATUS.MIGRATING, permissions: ['customers.read', 'customers.manage'] },
  { id: 'sales', label: 'Cotizaciones', order: 2, status: MODULE_STATUS.PLANNED, permissions: ['quotations.read', 'quotations.manage', 'quotations.approve'] },
  { id: 'purchases', label: 'Compras y proveedores', order: 3, status: MODULE_STATUS.PLANNED, permissions: ['purchases.read', 'purchases.manage', 'purchases.approve'] },
  { id: 'inventory', label: 'Inventario', order: 4, status: MODULE_STATUS.PLANNED, permissions: ['inventory.read', 'inventory.move', 'inventory.adjust'] },
  { id: 'production', label: 'Producción', order: 5, status: MODULE_STATUS.PLANNED, permissions: ['production.read', 'production.manage', 'production.complete'] },
  { id: 'support', label: 'Soporte y activos', order: 6, status: MODULE_STATUS.PLANNED, permissions: ['support.read', 'support.manage', 'support.assign'] },
  { id: 'finance', label: 'Finanzas y cartera', order: 7, status: MODULE_STATUS.PLANNED, permissions: ['finance.read', 'payments.manage', 'payments.reverse'] },
  { id: 'analytics', label: 'Indicadores', order: 8, status: MODULE_STATUS.PLANNED, permissions: ['analytics.read'] },
  { id: 'dian', label: 'Integración DIAN', order: 9, status: MODULE_STATUS.FINAL_STAGE, permissions: ['dian.read', 'dian.manage'] }
]);

export const moduleById = id => moduleCatalog.find(module => module.id === id) || null;
