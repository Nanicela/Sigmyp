# Importación del sistema anterior — 15 de octubre de 2026

## Resultado comprobado

Se copiaron y releyeron 10.706 documentos en el Firebase existente,
bajo organizations/500123568/legacyData/{tabla}/records/{clave}.
La comparación incluye contenido completo y metadatos, no solo conteos.
No se modificaron documentos existentes ni el servidor de origen.

La copia usa identificadores deterministas derivados de la clave primaria.
Cada documento conserva los campos originales en data, la clave de origen,
el tipo de registro y su huella. Los importes decimales se conservan como
texto exacto. Una repetición idéntica no escribe; un conflicto detiene el proceso.

Incluye 411 cuentas, 787 contactos, 1.389 oficinas, 141 proveedores,
29 contactos de proveedores, 196 productos, 740 ítems, 3.638 activos,
52 fichas de usuarios y otros catálogos.
Las operaciones incluyen 211 cotizaciones con 430 líneas, 207 órdenes
de producción con 438 líneas y 39 documentos de facturación con 97 líneas.
También hay 81 eventos de esos documentos dentro de 2026.
No se encontraron compras, kardex, soportes o remisiones fechados en 2026.

La selección usa [2026-01-01T00:00:00-05:00, 2027-01-01T00:00:00-05:00).
Los detalles dependen del documento seleccionado; los eventos con fecha
también se filtran. Los maestros no se filtran por año.
No se detectaron referencias no nulas fuera de la copia según las claves
foráneas declaradas en la base. Esto no acredita relaciones implícitas.

## Estado funcional y límites

Esta es una copia de origen para conciliación, no una conversión completa
a todos los modelos operativos nuevos. Los registros no son editables.
La consulta local en Comercial conecta Cuentas, Contactos, Oficinas y
Cotizaciones. El resto de los módulos debe incorporar sus adaptadores
antes de operar estos registros. No se mezclan cuentas incompletas con
el selector de facturación ni se recalculan importes originales.

Hay 19 grupos de identificaciones repetidas, 23 identificaciones vacías,
131 correos que requieren revisión, cinco contactos sin cuenta y dos
oficinas sin cuenta resoluble. Se conservan separados por clave de origen;
no se inventan documentos, correos ni datos tributarios.

No se importaron sesiones, logs de solicitudes (pueden contener tokens),
contraseñas, hashes/salts, credenciales de equipos o licencias.
Settings queda pendiente de clasificación para separar configuración
de secretos; attachments y archivos físicos quedan pendientes de
asociación y copia. Los seriales vinculados exclusivamente a kardex
anterior a 2026 no se importaron como operaciones; reconciliar su uso
como catálogo de activos antes de incorporarlos.
Los saldos iniciales y existencias deben conciliarse antes de habilitar
movimientos. Las fichas de usuarios no crean accesos en Authentication
ni asignan roles automáticamente.

## Acceso y publicación

La usuaria autorizó específicamente publicar solo reglas para lectura
comercial de DyD por Superadministrador, Administrador y Consulta.
No se autoriza editar importados ni consultar fichas privadas desde clientes.
No publicar Hosting ni subir a GitHub.

Se detectó que las reglas ya publicadas difieren de la rama local:
contienen contratos/oportunidades y una protección adicional de reservas.
Para evitar revertirlas se preparó el cambio mínimo sobre las reglas
publicadas y se probaron ambas variantes en emulador.
**No desplegar la raíz firestore.rules indiscriminadamente** hasta reconciliar
esa divergencia. El archivo exacto preparado y la copia anterior están en
work/migration-2026/firebase-import, fuera del repositorio.

## Evidencias privadas

En work/migration-2026: full-source.json y firebase-import/{plan,
apply-result,verify-result}.json; copias previas y posteriores de reglas.
No subir exportaciones ni datos personales a GitHub.
Export SHA-256: 8ac01694b179b3b617bc2825b1929746a8c0e5f7358ed0b760fd3f718e4412a3.

Pruebas: límites de fecha Colombia, conservación de decimales,
claves estables, duplicados, credenciales, referencias y proyección
comercial; reglas con miembros autorizados, otras compañías,
facturador, anónimo, datos privados y bloqueo de escrituras.

## Edición de cuentas preparada

El modal local incluye Actualizar datos, Guardar cambios y Cancelar, con
selectores de tipo de persona, estado, IVA, departamento y ciudad del catálogo
importado. Los cambios van a commercialAccounts/{sourceDocumentId}; legacyData
permanece intacto. Cada escritura exige auditoría atómica y versión coincidente;
Administrador y Superadministrador pueden editar y Consulta solo leer.
El servicio vuelve a cargar la proyección al abrir la compañía y actualiza la
tabla después del guardado. No se modificaron cuentas reales durante las pruebas.

Pruebas de normalización, compilación y permisos con emulador aprobadas, incluida
lectura posterior, escrituras sin auditoría, versiones atrasadas, origen alterado,
roles ajenos y cambios en otra compañía. Formulario probado con datos ficticios.
El bloque propuesto está en scripts/migration/commercial-account.rules.txt y la
versión mínima basada en reglas remotas en work/account-edit/firestore.rules.
La publicación de escritura fue solicitada a la usuaria y está pendiente de su
respuesta; la autorización anterior solo cubría lectura. No desplegar antes de
obtener esa autorización. Hosting y GitHub siguen fuera del alcance.

Creación local añadida: Crear cuenta abre el mismo formulario. Las cuentas nuevas
usan un identificador new_UUID en commercialAccounts, sin inventar una fila de
origen. Se cargan junto a las cuentas importadas. Las reglas locales propuestas
incluyen creación auditada; su publicación y el guardado real siguen pendientes
de autorización. No desplegar el archivo previo que solo contemplaba edición.

## Compras — 20 de octubre de 2026

Preparadas, creadas sin sobrescribir y releídas desde Firebase las proyecciones
`organizations/500123568/purchaseImports/{grupo}/records/{id}`:
141 proveedores, 29 contactos y 740 ítems; 0 órdenes y 0 movimientos de kárdex
2026 en la copia de origen. Incluye manifest con conteos/año; 911 documentos.
Los originales legacyData continúan intactos. Los duplicados de identificación
se conservan por ID; los vínculos a proveedores mantienen su clave de origen.
La proyección de consulta contiene campos explícitos; no expone créditos,
evaluaciones, costos promedio ni existencias heredadas sin conciliación.
Estos campos permanecen conservados en los originales protegidos.

Vue consulta los nuevos grupos desde el Firebase actual, con carga/errores por
separado de Comercial, buscador, paginación y modales de lectura. No se habilitan
altas ni edición. La aplicación compiló localmente y dos pruebas de proyección
más una prueba de permisos con todos los roles aprobaron. Reglas preparadas con
parche mínimo sobre la versión remota vigente; publicación PENDIENTE de la
respuesta solicitada a la usuaria. Sin Hosting/GitHub. Evidencia privada en
.local/purchases-migration (plan, summary, rules-before, rules-tests, build).

### Lectura de Compras habilitada

El 20 de octubre, tras autorización expresa, se publicaron únicamente las reglas
preparadas de lectura de purchaseImports. Comparación previa confirmó que la base
remota no cambió; comparación posterior verificó coincidencia byte por byte con
la versión probada. Superadministrador, Administrador y Consulta de DyD pueden
consultar los cinco grupos y manifest. Escrituras cliente y fuentes originales
continúan bloqueadas. No se publicaron Hosting ni GitHub.

## Creación y edición de Compras — 20 de octubre

Autorizadas, publicadas y verificadas las reglas purchaseRecords/purchaseEdits.
Administrador y Superadministrador de DyD pueden crear y editar con auditoría;
Consulta solo lee. Pruebas verifican cinco grupos, versión optimista, auditoría,
roles ajenos, aislamiento, referencias inexistentes, originales intactos y rechazo
de alteraciones de saldos/estado aplicado. Cuatro pruebas de emulador aprobaron.

Los datos importados no se sobrescriben. Los maestros nuevos conservan vínculos
validables a proveedores/ítems de la compañía. Las correcciones actualizan el
listado y los nombres relacionados. Órdenes nuevas son borradores de cabecera:
pendiente completar líneas, importes, numeración de emisión y aprobación. Kárdex
solo prepara ENTRY/EXIT en PENDING, por instrucción expresa; no modifica saldos.
Sus comentarios pueden editarse, sus cantidades no se aplican al inventario.

Interfaz local compilada, acciones con iconos/tooltips y formularios probados con
datos ficticios. No se crearon datos reales durante pruebas. Sin Hosting/GitHub.
Evidencia privada .local/purchase-edit (reglas anteriores/finales, tests.log,
deploy.log, verified-release.json, build.log).

- 2026-10-20: Proveedores contrastado con `/home/daniela/sigmyp/sigmyp2/app/static/app/view/purchases/NewProvider.js` y `Providers.js`. Recuperados certificado, tipo/monto de crédito y evaluación de los 141 originales en purchaseImports mediante actualización de campos con precondición de versión y verificación completa; originales/ediciones intactos. UI local muestra y edita los tres primeros, evaluación solo lectura (nuevos: 1). Reglas mínimas publicadas bajo autorización vigente de creación/edición de Compras, verificadas byte por byte; siete pruebas aprobadas y build local correcto. Evidencia .local/supplier-fields. Sin Hosting/GitHub. Referencia funcional y diferencias pendientes en docs/MODERNIZACION_SIGMYP.md.

- 2026-10-22: Órdenes de compra locales con proveedor, fecha, pago (contado/5/15/30/45/60/90/180 días), entrega prevista, dirección, referencia textual, comentarios y detalle de ítems/cantidad/costo/IVA 0-5-19. Se consultó NewPurchaseOrder.js y PurchaseOrderCRUD.js del original. Revisión inmutable sin límite fijo de líneas, importes enteros y publicación final auditada en purchaseOrderVersions/purchaseOrderRevisions. Guarda DRAFT, sin aprobación/recepción ni efecto en stock. Referencia textual no reemplaza los adjuntos del original; adjuntos, producción, aprobación y recepción pendientes. Encabezados nativos previos pueden completarse, preservando proveedor/fecha. Reglas mínimas publicadas bajo autorización vigente de creación/edición de Compras, verificadas exactamente; siete pruebas de emulador y dos de dominio/build aprobadas. Evidencia .local/purchase-orders; nueva base remota .local/purchase-orders/firestore.rules. Sin Hosting/GitHub ni órdenes de prueba reales.

- 2026-10-22: aprobación preparada LOCALMENTE, sin habilitar con datos reales. Callable approvePurchaseOrder valida admin/platform, compañía, usuario registrado/verificado, versión y detalle/totales en transacción; crea purchaseOrderApprovals inmutable y auditoría, idempotente, sin inventario. Reglas pendientes bloquean edición de purchaseOrderVersions cuando existe aprobación y prohíben escribir aprobaciones desde navegador. UI con confirmación y autor/fecha; purchaseOrderApprovalEnabled=false hasta despliegue coordinado. Cloud Billing API confirmó billingEnabled=false. No cambiar plan automáticamente. Antes de activar: habilitación Blaze consentida, configurar App Check (callable exige token; web actual sin siteKey), desplegar únicamente esta función y parche mínimo de reglas, probar y luego activar bandera. Cinco pruebas en emulador aprobadas y compilación correcta. Evidencia .local/purchase-approval. No reglas/Hosting/Functions/GitHub publicados en esta entrega; base remota sigue .local/purchase-orders/firestore.rules.

### Excepción autorizada: diez órdenes históricas (23 de octubre de 2026)

Se incorporaron a la consulta de Compras las diez órdenes más recientes disponibles en el respaldo local `sigmyp2/db_backup/backup.sql`: **OC-2020-995 a OC-2020-1004**, con fechas del **27 de agosto al 23 de octubre de 2020**, y sus **26 líneas de ítems**. No representan una consulta actual al servidor anterior. Se conservaron los totales y estados originales; los subtotales coinciden con las líneas y los vínculos con proveedores e ítems están presentes. No se alteraron inventarios, aprobaciones ni archivos fuente. La excepción no amplía el alcance anual de los demás módulos.

La importación añade diez documentos a `purchaseImports/purchaseOrders/records` y actualiza su conteo en `purchaseImports/manifest` en una única operación, con precondiciones y verificación de contenido. El manifiesto identifica esta excepción en `historicalPurchaseOrders`. Evidencia y respaldo previo en `.local/historical-orders`. No ejecutar el antiguo migrador general sobre este manifiesto sin preservar la excepción.

### Producción: preparación local del 23 de octubre de 2026

Preparados 196 productos maestros, 207 órdenes de producción de 2026 y 438 líneas de productos, con relación a cuentas. La fuente migrada no contiene remisiones ni procesos. Se conservan originales; la nueva proyección selecciona campos comerciales y no publica archivos privados, credenciales ni fichas de personal.

Pendiente aplicar: Firestore devolvió `429 RESOURCE_EXHAUSTED: Quota exceeded` al consultar la nube. No hubo escrituras reales. La UI local tiene pestañas y consulta conectada a `productionImports`, aún no habilitada. Las reglas de lectura para DyD admin/viewer/platform están preparadas y probadas en emulador, sin publicar. No habilitan creación, edición, aprobaciones ni movimientos de inventario.

Para continuar cuando se recupere la cuota: verificar reglas vigentes contra `.local/contact-supplier/firestore.rules`, revisar `.local/production/plan.json`, ejecutar `scripts/migration/production.mjs --apply` y verificar los registros, publicar exclusivamente el parche `scripts/migration/production-read.rules.txt` sobre la base remota confirmada, verificar lectura con los roles permitidos. No desplegar las reglas raíz: contienen cambios de aprobación pendientes. No modificar el plan de facturación ni publicar Hosting/GitHub sin autorización.

### Producción: importación completada el 27 de octubre de 2026

Tras autorización explícita se crearon y verificaron 196 productos y 207 órdenes de producción (438 líneas) en `organizations/500123568/productionImports`. El respaldo no contiene remisiones ni procesos para esta proyección. Los originales permanecen intactos. Las reglas de lectura para Superadministrador y Administrador/Consulta de DyD fueron publicadas y verificadas; las escrituras desde la aplicación siguen bloqueadas. Evidencia privada en `.local/production/verified.json` y `verified-release.json`.

La aplicación sigue local. Entrar con acceso a DyD y abrir Producción → Gestión. Las tablas ofrecen consulta y detalle; aún no permiten crear/editar ni aprobar producción. Este avance sustituye el bloqueo por cuota documentado el 23 de octubre y no implica que la cuota diaria sea ilimitada.
