# Modernización integral de SIGMYP

Actualizado: 15 de octubre de 2026.

## Propósito

Construir una versión moderna de SIGMYP que reúna la operación comercial, compras, inventario, producción, soporte, cartera e indicadores en una sola aplicación Vue 3 y Firebase. El sistema anterior de DyD se usa como referencia de recorridos y datos, pero su código, arquitectura y base de datos no se trasladan literalmente.

La modernización debe conservar cuatro condiciones ya acordadas:

- una superadministradora puede trabajar con varias compañías;
- cada usuario normal pertenece a una sola compañía;
- todas las operaciones relevantes quedan atribuidas a un usuario y registradas en auditoría;
- la integración y habilitación DIAN se aborda al final, cuando los módulos internos estén estables.

La base operativa usa únicamente el año calendario vigente para las transacciones. Los datos maestros continúan entre años y los registros históricos sujetos a conservación se trasladan a un archivo verificable, conforme a [RETENCION_DATOS.md](RETENCION_DATOS.md).

## Alcance funcional

| Área | Referencia anterior | Versión mejorada en SIGMYP | Orden |
|---|---|---|---:|
| Plataforma | Usuarios, cargos, roles, permisos y registro de actividad | Sesión, ficha de usuario, compañía única, permisos por acción y auditoría inmutable | 0 |
| Datos maestros | Clientes, contactos, sedes y ubicaciones | Clientes con contactos y sedes, validación de identidad y estado activo/inactivo | 1 |
| Comercial | Cotizaciones y duplicación | Cotizaciones versionadas, estados, vigencia, conversión posterior y trazabilidad | 2 |
| Compras | Proveedores y órdenes de compra | Proveedores, contactos, órdenes, aprobación, recepción parcial y anulación auditada | 3 |
| Inventario | Ítems, categorías, kárdex y series | Catálogo de ítems, ubicaciones, movimientos inmutables, existencias calculadas y seriales | 4 |
| Producción | Productos, materiales, procesos, recursos, órdenes y remisiones | Fichas técnicas, materiales, rutas, órdenes, consumos, terminados y remisiones | 5 |
| Soporte | Máquinas, casos, respuestas, soluciones y tiempos | Activos instalados, tickets, historial, responsable, SLA, solución y adjuntos | 6 |
| Finanzas | Facturas, estados, pagos, exportación y reportes | Documentos, cuentas por cobrar, pagos, aplicaciones, reversos y estado de cuenta | 7 |
| Indicadores | Cantidad y valor de facturas/cotizaciones | Tableros por compañía, periodo y módulo, basados en datos operativos verificables | 8 |
| DIAN | No forma parte de la migración del sistema anterior | Numeración, XML, firma, CUFE/CUDE, transmisión, respuestas y conservación | 9 |

Nómina, bancos y contabilidad de doble partida no aparecen en el inventario funcional recuperado y no se incorporan sin definir antes sus recorridos y límites.

## Arquitectura objetivo

La interfaz se construye íntegramente con Vue 3, Vite y Pinia. Cada módulo debe tener componentes, estado y servicios propios. La capa JavaScript anterior se retirará por módulo después de comprobar paridad, sin hacer una sustitución total en un solo cambio.

Firebase es la plataforma de datos del proyecto: Authentication mantiene correo/contraseña y Google; Firestore conserva los datos separados por compañía; Cloud Functions ejecutará las transacciones que no deban confiarse al navegador; Storage guardará adjuntos cuando se habiliten. No se desarrollará una segunda base de datos paralela. Los datos que afecten existencias, saldos, aprobaciones o documentos fiscales necesitarán una operación confiable de servidor antes de entrar en producción; las reglas del navegador por sí solas no bastan para esos recorridos.

El mapa de procesos es la navegación funcional principal. Cada proceso incorpora una pestaña **Gestión** cuando al menos una herramienta de ese proceso está disponible. Dentro de ella, cada módulo aparece como una subpestaña que presenta sus datos en tablas sin abandonar la caracterización. Los datos provienen del contexto Vue que la aplicación ya cargó desde Firestore, por lo que conservan compañía activa, rol y permisos; las altas y ediciones se abren mediante «Abrir gestión completa». Los módulos planeados no aparecen hasta tener interfaz, esquema Firestore, reglas y pruebas aprobadas.

| Proceso | Herramientas asignadas |
|---|---|
| Planeación y direccionamiento | Datos de empresa; usuarios y permisos |
| Mejora continua | Indicadores y tableros |
| Comercial | Clientes, contactos, sedes, cotizaciones y soporte al cliente |
| Desarrollo | Productos y definición técnica |
| Compras | Proveedores, órdenes de compra e inventario recibido |
| Producción | Inventario de operación, productos, materiales, órdenes y remisiones |
| Talento humano | Se incorporará cuando se defina su alcance funcional |
| SG-SST / recursos físicos | Activos y soporte de infraestructura |
| Financiera | Facturación, pagos, cartera y, al final, integración DIAN |

Estructura conceptual:

```text
registeredUsers/{uid}
companyAssignments/{email}
organizations/{companyId}
  members/{uid}
  audit/{eventId}
  customers/{customerId}
  customerContacts/{contactId}
  customerSites/{siteId}
  quotations/{quotationId}
  suppliers/{supplierId}
  supplierContacts/{contactId}
  purchaseOrders/{purchaseOrderId}
  items/{itemId}
  inventoryMovements/{movementId}
  serials/{serialId}
  products/{productId}
  billsOfMaterials/{bomId}
  productionOrders/{productionOrderId}
  referrals/{referralId}
  assets/{assetId}
  supportTickets/{ticketId}
  drafts/{documentId}
  payments/{paymentId}
  paymentApplications/{applicationId}
```

Los nombres son el diseño de referencia. Cada colección se activa solamente cuando exista su esquema, reglas, índices, pruebas y recorrido de interfaz.

## Convenciones de datos

Todo registro operativo nuevo debe incluir `schemaVersion`, `companyId`, estado, fecha de creación, fecha de actualización, usuario creador y usuario que hizo el último cambio. Las fechas de negocio, como vencimiento o fecha de entrega, se guardan separadas de los instantes de auditoría.

Las transacciones también incluyen `businessYear`, derivado de su fecha de negocio en la zona horaria de Colombia. Las consultas operativas exigen ese campo para recuperar solo el año vigente y evitar lecturas completas de periodos anteriores.

Las operaciones deben seguir estas reglas:

- Las referencias importantes conservan también una copia histórica de los datos usados en el momento de la operación.
- Los movimientos de inventario, aplicaciones de pagos y eventos de auditoría son inmutables; una corrección crea un reverso relacionado.
- Las órdenes y documentos usan estados explícitos y transiciones permitidas. Editar campos no reemplaza aprobar, anular, recibir o pagar.
- Los reintentos usan una clave de idempotencia para no duplicar movimientos, pagos o documentos.
- Los totales y existencias se calculan con unidades enteras apropiadas, por ejemplo centavos, y con reglas de redondeo documentadas.
- Cada consulta y escritura verifica compañía y permiso. La interfaz oculta acciones no permitidas, pero las reglas y el servidor también las rechazan.

## Roles y permisos

Se conservan los perfiles visibles actuales:

- **Superadministrador:** acceso global a compañías y configuración de plataforma.
- **Administrador:** acceso completo a una sola compañía, excepto funciones exclusivas de plataforma.
- **Consulta:** lectura de los módulos autorizados de una sola compañía.

El rol anterior de facturador permanece oculto. Al ampliar los módulos, los permisos se expresarán por acciones como `customers.read`, `quotations.approve`, `inventory.move` o `support.assign`. Administrador y Consulta serán conjuntos predeterminados; más adelante podrán existir roles personalizados dentro de una compañía sin conceder acceso global.

## Estrategia de migración

1. Terminar la base Vue: estado de sesión, compañía activa, rol, navegación y permisos centralizados en Pinia.
2. Migrar primero Clientes, Contactos y Sedes. Es la base compartida por cotizaciones, facturación, soporte y activos.
3. Implementar Cotizaciones y después Proveedores/Compras.
4. Incorporar Inventario con movimientos y existencias confiables antes de Producción.
5. Incorporar Producción y Remisiones sobre productos, materiales y movimientos ya estables.
6. Incorporar Activos y Soporte.
7. Completar pagos, cartera e indicadores cruzados.
8. Preparar migración de datos reales mediante exportación, limpieza, correspondencias, simulación y conciliación. No conectar la aplicación nueva directamente a la base antigua.
9. Ejecutar la etapa DIAN al final.

Cada entrega se prueba localmente con datos ficticios y debe conservar el comportamiento ya aprobado. Durante la migración vigente no se publica en Firebase ni se envía a GitHub sin autorización expresa.

## Primer incremento

El siguiente incremento de código es la base común de módulos:

1. centralizar identidad, compañía activa, rol y permisos en Pinia;
2. declarar un catálogo único de módulos y acciones;
3. migrar Clientes a Vue con tabla, búsqueda y modales de consulta/edición;
4. añadir Contactos y Sedes asociados al cliente;
5. definir reglas y pruebas de aislamiento por compañía;
6. probar todo localmente antes de retirar el módulo clásico.

Este incremento no modifica datos reales ni vuelve a mostrar módulos incompletos en la navegación pública.
