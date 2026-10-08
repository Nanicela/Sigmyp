# Verificación del primer avance

Fecha: 28 de septiembre de 2026.

## Ejecutado

- Seis pruebas unitarias aprobadas: IVA, mezcla de tarifas, redondeo, cifras grandes, entradas inválidas y requisitos de notas.
- Siete pruebas de integración aprobadas contra Firebase Emulator Suite (Authentication, Firestore y Cloud Functions): acceso anónimo denegado, separación entre empresas, escrituras directas denegadas, autenticación en funciones, concurrencia/idempotencia, referencias de notas, privilegios administrativos y revocación de acceso.
- Build de la interfaz completado con esbuild y SDK Firebase.
- Recorrido visual en navegador: sesión de emulador activa, registro de empresa ficticia y guardado de factura de ejemplo por $100.000 + $19.000 de IVA = $119.000; la pantalla confirmó el guardado. Evidencia: `primer-avance.png`.

Comando reproducible: `bash scripts/local.sh test`. El reporte de consola detallado se conserva como archivo intermedio de trabajo, fuera de este entregable.

## Límites

Las pruebas ejercitan emuladores con identidades ficticias. No validan servicios desplegados, App Check real, IAM, capacidad de producción, certificación ISO, anexo DIAN, firma digital ni respuestas de la DIAN. Los cálculos son preliminares y cubren solo el alcance descrito en README.

## Firebase real y modo Spark

Se registró la app web, se habilitó acceso Google y se creó Firestore Standard `(default)` en `us-central1`. Las reglas privadas fueron publicadas desde la consola. El proyecto permanece en Spark. El build usa la configuración real y el navegador muestra «Firebase nube · Spark · Borradores» en http://localhost:5500.

Cuatro pruebas adicionales aprobadas en el emulador aislado `demo-spark-tests`: privacidad por UID; rechazo de importes alterados, actualización y validez fiscal; límite de tres conceptos; referencias y comprador de notas. También se repitieron las seis pruebas del dominio y la compilación real.

Comando para las pruebas Spark con Firestore Emulator en 8181: `node tests/spark.rules.test.mjs`. No se deben ejecutar contra Firestore real.

Pendiente completar la sesión Google y verificar el primer guardado real. No se ha publicado en Hosting ni desplegado Cloud Functions; no se activó Blaze.

## Publicación en Hosting — 29 de septiembre de 2026

Firebase CLI confirmó `Deploy complete` para `facturacion-electronica-a73e3`, únicamente Hosting. URL: https://facturacion-electronica-a73e3.web.app. No se modificaron reglas, facturación ni Cloud Functions durante este despliegue. El acceso Google en el dominio publicado requiere comprobación con la cuenta de la usuaria.

## Fichas empresariales y clientes — 30 de septiembre de 2026

Cinco pruebas de reglas Spark aprobadas en demo-spark-tests, incluyendo creación/edición de perfiles, aislamiento, rechazo de identidades modificadas, campos extra y datos inválidos. Cinco comprobaciones adicionales de normalización de perfiles aprobadas. Build real completado. El navegador disponible no tiene sesión Google, por lo que el recorrido autenticado en producción requiere comprobación de la usuaria.

## Menú lateral — 30 de septiembre de 2026

Cinco vistas con iconos SVG y navegación por hash. Comprobación visual con una vista local aislada y datos ficticios: nuevo documento, historial, registro de empresa, ficha empresarial y clientes. Se comprobó que el campo escrito en Clientes permanece tras cambiar de sección y regresar. Compilación real completada; cambios limitados a Hosting, sin modificar reglas ni documentos.

## Bienvenida y menú compacto

Compilación con entradas separadas para landing y aplicación. Comprobación visual de la bienvenida y de minimizar/expandir el menú en una vista aislada de diseño. La preferencia de menú compacto sobrevivió a una recarga. La sesión Google real requiere comprobación por la usuaria; no se accedió a datos de producción durante estas pruebas.

## Consultas del historial

Dos pruebas aprobadas contra demo-history-tests: validación de fechas y conversión UTC-5; consulta real del emulador con límites de día, tipo y comprador combinados; paginación de 28 registros con misma fecha sin duplicados y rechazo de consulta por otro usuario. Se definieron tres índices compuestos para los filtros. Los datos de producción no se modificaron.

## Vista visual del borrador

Compilación aprobada. Vista modal verificada en navegador con dos conceptos ficticios y total de $238.000, con aviso de borrador. Comprobado cierre con Escape. Evidencia en ../vista-factura.png. Se mantienen los valores almacenados; no se alteraron cálculos, reglas ni registros de producción. Referencia funcional consultada: https://siigonube.portaldeclientes.siigo.com/descargar-e-imprimir-factura-electronica/.


## Roles por empresa — desarrollo local

Implementados en modo Spark sobre `organizations/{nit}` con miembros por correo verificado (máximo 50 por empresa). `platformAdmin` es un custom claim asignable únicamente desde un entorno privilegiado. Los roles de empresa son admin, billing y viewer; no conceden acceso global. El administrador de empresa no puede retirarse su propio rol de administrador. La sección Usuarios y permisos guarda autorizaciones; no envía correos ni crea cuentas.

Pruebas: `node --test tests/roles.rules.test.mjs` contra Firestore Emulator, cuatro casos aprobados: aislamiento y consultas por pertenencia, creación de borradores e importes, escalada y retirada de accesos, fichas y compradores. No se han desplegado reglas ni Hosting. Los datos reales permanecen bajo workspaces: antes de una futura publicación debe prepararse y validarse su migración, asignar el claim a la cuenta real y desactivar el flujo antiguo cuando corresponda. El modo Functions anterior no forma parte de esta adaptación.

Arranque: `bash scripts/local.sh roles`; en otra terminal con Node disponible: `node scripts/seed-roles.mjs`. Abrir http://127.0.0.1:5500/. Cuentas exclusivamente ficticias: super@example.test, admin@example.test, facturador@example.test, consulta@example.test, otra@example.test. Contraseña local común: DemoFirebase123! El emulador es temporal; reiniciarlo requiere volver a cargar los datos de prueba.


## Publicación autorizada de roles — 2026-09-30

Por petición expresa «publica los roles», se publicaron Hosting, reglas e índices en facturacion-electronica-a73e3. Se verificó por correo la identidad activa y verificada de la propietaria y se añadió platformAdmin conservando sus otros claims. El cliente renueva el token al entrar. Se copió de forma atómica la empresa anterior y su documento descendiente a organizations; se verificaron los campos y se conservaron los originales. El respaldo privado está fuera de Hosting en work/roles-migration-1790804095136/backup.json.

Las cinco pruebas de roles pasaron. La estructura workspaces queda en solo lectura para su propietario previo, como archivo histórico: esos permisos de archivo no dependen de los nuevos roles. No se importaron cuentas ficticias. Se verificó nuevamente la coincidencia origen/destino después de publicar.

La compilación publicada utiliza dist-release mediante firebase.release.json; dist sigue usando emuladores para no convertir la vista local en una conexión real. Los futuros cambios continúan locales salvo petición expresa. La apertura del sitio publicado muestra el acceso Google; no se ha simulado la sesión Google real de la usuaria.


## Edición, registro y auditoría — preparado el 2026-10-01

Estado: implementación y pruebas en emuladores; pendiente elección de la usuaria sobre publicación completa. NO se activaron nuevas reglas ni proveedor de contraseña en el proyecto real durante esta preparación. dist-cloud y Hosting siguen en su versión anterior. Vista de prueba: http://127.0.0.1:5500/.

El acceso usa correo como usuario y contraseña, ficha inmutable propia en registeredUsers/{uid}, verificación del correo y roles por empresa. La ficha requiere nombres, apellidos, tipo/número de documento, teléfono y cargo. Ninguna contraseña se guarda en Firestore. La lista de fichas completas es privada para la superadministradora (100 más recientes); los administradores de empresa siguen gestionando los correos y roles de su empresa. La aplicación nueva redirige sesiones Google a la creación de contraseña por recuperación; el mismo UID y sus permisos se conservan. No se desactiva el proveedor Google del proyecto para evitar cortar la transición.

Las operaciones de empresa/permisos, fichas tributarias, compradores y borradores se escriben junto a un evento obligatorio e inmutable en organizations/{nit}/audit/{id}. Las reglas comprueban UID/correo del token, hora servidor, versión y copia exacta anterior/posterior; no admiten guardar sin auditoría. El historial no atribuye retrospectivamente autores a datos antiguos. La edición solo admite DRAFT y fiscal_validity=false, conserva fecha de creación/tipo/referencia, recalcula importes y rechaza versiones obsoletas. Las facturas con notas quedan bloqueadas para edición. Antes de activar sobre datos reales, revisar y bloquear referencias preexistentes si las hay.

Siete pruebas aprobadas en tests/audit-edit.test.mjs: registro y privacidad, creación/edición/reintentos, aislamiento/roles/autoría y snapshots falsos, notas y estados emitidos, cambios tributarios/permisos, tres conceptos y edición por facturador. Prueba UI: ficha ficticia super@example.test, edición del borrador ejemplo y consulta del cambio con antes/después. tests/spark.rules y roles.rules corresponden a etapas anteriores (sin auditoría) y ya no son la suite vigente para writes.

Pendiente para activación: respuesta de publicación, copia previa y conciliación de notas antiguas, habilitar Email/Password en Auth y política de contraseña, desplegar reglas y frontend juntos, verificar archivos/configuración. La contraseña real la elegirá la usuaria mediante el correo de recuperación; nunca debe introducirla el agente.

## Activación autorizada — 2026-10-01

La usuaria autorizó «activalo». Email/Password está habilitado en el proyecto real con política ENFORCE y longitud mínima de 12 caracteres. Google se conserva para la transición. Se inspeccionaron una empresa y dos documentos: ninguna nota ni referencia pendiente de bloqueo; los documentos existentes no se modificaron. Respaldo privado: work/activation-1790871539604/backup.json, fuera de Hosting.

Se desplegaron reglas, índices y Hosting con firebase.release.json; se actualizaron dist-release y dist-cloud con configuración real. La compilación añade versiones por hash a los recursos para evitar mezclas de caché. Las reglas compilaron y se publicaron correctamente; el compilador emitió advertencias de tipo null en llamadas de creación a auditWrite (sus casos de creación están cubiertos en las siete pruebas indicadas arriba).

Se verificaron visualmente los formularios de correo y contraseña publicados y locales y la apertura del panel de recuperación local. No se envió correo real ni se inició sesión en nombre de la propietaria. Para completar su acceso debe solicitar el enlace con su correo existente, elegir su contraseña y completar su ficha. El puerto 5504 conecta Firebase real; 5500 continúa siendo el entorno ficticio de pruebas.

## Navegación por compañía — local, 2026-10-01

La entrada al espacio exige seleccionar explícitamente una compañía; se eliminó la elección automática del primer resultado. La pantalla Compañías muestra tarjetas y selector con los accesos ya filtrados por permisos. Tras seleccionar se abre Documentos y aparecen los submenús de la compañía, junto con un encabezado y acción Cambiar compañía. Se conservan los permisos existentes y el menú minimizable.

Compilación dist-cloud real aprobada. Comprobación visual en fixture aislado con datos ficticios: entrada sin selección, apertura de una compañía, regreso al selector, cambio a otra y minimizar/expandir el menú. Evidencia: ../menu-por-compania.png. No se hicieron escrituras reales ni despliegue en esta entrega. La verificación visual no sustituye una sesión autenticada real de la usuaria.

## Notas desde documentos — local, 2026-10-01

Se agregaron Crear nota crédito / Crear nota débito a las filas de facturas en borrador para roles autorizados. Ver documento conserva la última posición. El inicio consulta la factura actual de la compañía, admite referencias fuera de los primeros 100 documentos y conserva el comprador como campos de solo lectura. El formulario pide motivo y conceptos propios del ajuste; informa del bloqueo de edición del origen y de la ausencia de efectos fiscales/saldos. La tabla muestra ID y referencia de las notas.

Compilación real dist-cloud y pruebas de dominio aprobadas. Siete pruebas de auditoría/acceso aprobadas contra emuladores, incluido guardado de nota con bloqueo del origen. No se modificaron reglas ni se publicó Hosting; tampoco se crearon notas reales. Pendiente prueba de interacción con sesión de la usuaria en localhost:5504.


## Publicación de menú y notas — 2026-10-01

Por petición expresa «haz deploy», se publicó dist-release en Firebase Hosting real. Publicación completada y seis archivos verificados por igualdad con la compilación: HTML, scripts, estilos y configuración. Incluye selección de compañía, submenús y notas desde documentos. No se cambiaron reglas, índices ni datos durante este despliegue.

## Seleccionar o crear cliente desde factura — local, 2026-10-01

El formulario de factura exige un cliente del directorio de la compañía activa; nombre e identificación quedan en solo lectura. La creación rápida usa un diálogo con los mismos campos y validaciones de la ficha, escritura auditada, detección de duplicados y selección automática, sin reiniciar el borrador. Cancelar conserva el borrador. Las notas conservan el comprador del origen y no permiten creación o selección distinta.

Antes de guardar una factura desde esta interfaz, la transacción verifica que el cliente seleccionado siga existiendo en la compañía y que su nombre e identificación coincidan. Se conserva la copia histórica actual de nombre e identificación en buyer; no se incorporó aún una copia de toda la ficha tributaria ni un nuevo campo persistente de customer_id. Las reglas existentes siguen admitiendo el formato antiguo; la obligatoriedad de selección corresponde a este flujo de interfaz, no a una nueva restricción de Rules.

Ocho pruebas de auditoría/acceso aprobadas, incluido rechazo de cliente inexistente o datos obsoletos y copia histórica inalterada al cambiar el cliente. Prueba visual en emuladores: cliente ficticio Cliente prueba rápida creado desde factura, seleccionado automáticamente y descripción Servicio de prueba conservado intacta. Evidencia: ../cliente-desde-factura.png. dist-cloud compilado con configuración real. Sin despliegue ni escrituras en producción.

## Publicación y datos DEMO reales — 2026-10-01

Por instrucción expresa «haz deploy de todo y crealo en la base de datos», se publicó Hosting y se verificaron los seis archivos contra dist-release. Se ejecutó scripts/seed-real-demo.mjs apply sobre facturacion-electronica-a73e3. Una escritura atómica con precondiciones exists:false creó exclusivamente organizations/999000001 y sus descendientes, sin reemplazar datos existentes.

Conjunto: DEMO · Comercial de Pruebas; ficha tributaria ficticia; dos clientes CC ficticios; dos facturas en DRAFT (59.500 y 238.000 COP), nota crédito de 23.800 COP y débito de 11.900 COP sobre la segunda; ocho eventos de carga atribuidos a system-demo-seed. Rol admin de la compañía asignado al correo existente danielao@grupodyd.com, sin crear otras cuentas ni cambiar claims globales. Los 16 registros se releyeron y verificaron. Los importes se calcularon con el módulo de dominio. La factura con notas está bloqueada para edición; la otra permite editar. Ningún documento tiene validez fiscal. No se desplegaron reglas nuevas.

## Lista y ficha de clientes — local, 2026-10-01

Directorio organizado en filas con nombre, documento, correo y Ver cliente al final. Modal de solo lectura con identificación, contacto, dirección y datos tributarios. Editar se ofrece a roles platform/admin/billing; el formulario se abre únicamente al editar o pulsar Nuevo cliente. La creación rápida conserva su formulario visible independiente. Al cargar otra compañía se cierra la ficha para no mantener datos de la selección previa.

Compilaciones real dist-cloud y emulador dist aprobadas. Verificación visual en emuladores: lista con tres clientes ficticios, apertura de ficha y cierre con Escape devolviendo el foco a Ver cliente. Sin cambios de datos ni despliegue. Evidencia: ../ficha-cliente-modal.png.


Publicación autorizada de lista y modal de clientes: Hosting desplegado el 2026-10-01 y seis archivos verificados contra dist-release. Sin cambios de reglas ni datos.


## Paleta vino, negro y plateado — publicada

Por petición expresa «haz deploy», se publicó la nueva paleta en Hosting. Compilación aprobada y seis archivos publicados verificados contra dist-release. La vista local de bienvenida y selección de compañías se revisó visualmente antes de publicar. No se modificaron datos ni reglas.

## Cuentas de prueba por rol — 2026-10-01

La usuaria solicitó usuarios para todos los roles y confirmó cuentas de prueba en DEMO. Se crearon demo-admin@example.test (admin), demo-billing@example.test (billing) y demo-viewer@example.test (viewer) en Authentication real con claves aleatorias independientes y fichas ficticias en registeredUsers. Los correos reservados example.test se verificaron administrativamente solo para estas cuentas ficticias, no reciben correo. Sin claims globales. Se preservó la cuenta existente danielao@grupodyd.com como superadministradora.

Solo se añadieron membresías a organizations/999000001, conservando accesos previos y registrando el cambio en auditoría como system-demo-users. Se comprobó inicio de sesión por contraseña para las tres cuentas, lectura de ficha propia, listado de una única compañía DEMO y rechazo al leer otra compañía real. No se modificaron documentos comerciales, reglas ni Hosting. Credenciales entregadas en ../credenciales-usuarios-demo.txt, modo 0600, fuera de los directorios publicados. Script scripts/create-demo-users.mjs conserva estado privado en work/demo-user-access.json para evitar restablecimientos en reintentos.

## Compañía única por usuario — preparado localmente

La asignación de roles ahora reserva companyAssignments/{email} y actualiza la compañía y auditoría en una transacción. Las reglas exigen una sola membresía modificada por operación y una reserva coincidente; impiden crear reservas sueltas, sobrescribirlas para apuntar a otra compañía y añadir membresías sin reserva. Retirar acceso elimina la reserva en la misma transacción; el traslado requiere retirar antes de reasignar. platformAdmin conserva acceso global sin depender de membresías.

Nueve pruebas aprobadas en emuladores, incluida reserva, duplicación, sobrescritura, asignación múltiple, baja y traslado. Inspección real de solo lectura mediante scripts/prepare-single-company.mjs: 3 compañías y 3 correos de usuarios normales, sin conflictos; correos con claim global excluidos de la migración de reservas. Scripts de provisión privilegiados deben respetar este índice al agregar cuentas futuras.

No se modificó la base real ni se desplegaron reglas/Hosting. Para activar, ejecutar migración apply y publicar reglas y aplicación conjuntamente; repetir inspección por posibles cambios concurrentes. Hasta entonces se conserva dist-cloud anterior para no romper la edición de accesos real. dist contiene la versión nueva para emuladores.

## Compañía única activada — 2026-10-01

Autorización expresa: «Si, y haz deploy». Se respaldaron compañías y reservas existentes fuera de Hosting en work/single-company/before-*.json. Migración atómica: tres reservas para los usuarios normales, conservando membresías; ningún conflicto previo. Se desplegaron firestore:rules y Hosting juntos; compilación de reglas correcta con las advertencias null ya presentes en llamadas de creación auditadas. Se actualizó dist-cloud con el frontend compatible.

Los seis archivos publicados coinciden con dist-release. La verificación posterior comprueba reservas faltantes y conflictos; las cuentas DEMO se verifican mediante inicio de sesión real, ficha propia, consulta de compañía única y lectura de su reserva. No se modificaron facturas, clientes ni contraseñas. Las nueve pruebas de reglas previas cubren asignaciones duplicadas y traslado atómico.

## Resumen en vivo del documento — local

Subtotal, IVA agrupado por tarifa y total en tiempo real, con importe de cada concepto. Reutiliza functions/domain.cjs, manteniendo redondeo por línea y centavos enteros. Ante conceptos incompletos o inválidos oculta el agregado, evitando un total parcial. Funciona al agregar, quitar, cargar edición y reiniciar conceptos. Compilaciones local real y emuladores aprobadas; suites de dominio y resumen aprobadas (casos de mezcla de tarifas, redondeo e incompletos). Comprobación visual: 2 × 100.000, subtotal 200.000, IVA 38.000, total 238.000 COP. Sin guardar datos ni desplegar. Evidencia ../resumen-factura-en-vivo.png.

Orden de trabajo previsto: completar preparación de documentos, catálogo de productos/servicios, condiciones de pago y vencimientos, consultas y exportación; dejar integración DIAN para el final según instrucción de la usuaria. Este orden no equivale a una comparación exhaustiva con Siigo ni a una certificación fiscal.


Resumen en vivo publicado por petición expresa «haz deploy». Hosting completado y seis archivos verificados contra dist-release. Sin cambios en reglas ni datos.

## Entrada automática por compañía — local

Administrador, facturador y consulta seleccionan automáticamente su única compañía al cargar el listado. La navegación oculta Compañías, Registrar empresa y Cambiar compañía para roles no globales; mantiene visible el nombre de la compañía activa. Solo platformAdmin conserva selección explícita, incluso con una sola compañía. Sin asignación, con conflicto de múltiples compañías o fallo de carga se muestra el estado correspondiente, sin elegir arbitrariamente.

Pruebas de selección aprobadas para los tres roles normales, selección explícita global, ausencia de acceso y conflicto. Compilaciones dist-cloud real y dist emuladores aprobadas. Revisión visual con fixture aislado de navegación para los cuatro roles: selector solo visible para platform, Nuevo documento oculto para consulta, Usuarios disponible para administrador. Evidencia ../acceso-directo-compania.png. No se modificaron reglas ni datos, no se publicó Hosting.


Entrada automática por compañía publicada por petición expresa «haz deploy». Hosting completado y seis archivos verificados contra dist-release. No se modificaron reglas ni datos.

## Catálogo de productos y servicios — local, 2026-10-01

Alta, edición, búsqueda y desactivación por compañía; código único e inmutable, tipo, nombre, descripción, precio COP en centavos e IVA 5/19. Administración para platform/admin; billing/viewer pueden leer el catálogo de su compañía. Escrituras auditadas, versiones para evitar sobrescrituras concurrentes y rechazo de escrituras sin auditoría. Sin control de inventario.

Selector por concepto de documento copia nombre, precio e IVA; los valores guardados en documentos anteriores permanecen independientes de las ediciones del catálogo. Solo artículos activos aparecen como nuevas opciones. Se conserva la posibilidad de concepto libre.

Once pruebas de tests/audit-edit.test.mjs aprobadas: incluyen validación de importes, código duplicado, edición desactualizada, conservación de precio histórico, permisos por rol y rechazo de acceso externo. Compilación de emuladores aprobada. Verificación de interfaz con servicio ficticio SERV-DEMO-UI: selección copia 100.000 COP, IVA 19.000 y total 119.000. Evidencia ../catalogo-productos.png; vista http://127.0.0.1:5500/app.html#productos en demo-facturacion.

Sin cambios en Firebase real ni publicación. Para activar con datos reales es necesario desplegar firestore:rules y Hosting conjuntamente; luego reconstruir dist-cloud. La vista local conectada a Firebase real conserva por ahora la versión anterior. DIAN sigue pendiente para el final.

## Guía de diseño incorporada — 2026-10-02

La usuaria pidió tener en cuenta la conversación «Explicación sistemas facturación»: https://chatgpt.com/share/6abfce1a-6b38-83e8-9d88-172e3992ab99 . Leída completa como referencia de arquitectura y alcance, no como normativa verificada ni evidencia de funcionalidades ya implementadas. Este apartado establece planificación; no modifica datos, reglas ni aplicación.

Principios para los siguientes avances:

- Separar borrador editable de documento fiscal expedido e inmutable. Preservar originales y sus números; correcciones mediante documentos vinculados. Diseñar notas referidas al documento origen, motivos y ajustes parciales/totales, sin cadenas arbitrarias entre notas. Validar los casos y excepciones contra normativa vigente antes de implementar emisión.
- Separar estados de preparación, fiscal, entrega, comercial y pago. Mantener auditoría de cambios y eventos de procesamiento; no confundir el historial de edición existente con eventos fiscales o de entrega aún inexistentes.
- Conservar copia histórica completa de emisor, comprador y líneas, además de referencias a cliente/producto, código y unidad. El avance actual solo conserva nombre/identificación del comprador y valores de línea; no afirmar que ya almacena toda la ficha tributaria ni productId. No reconstruir supuestos datos históricos desde fichas actuales al migrar.
- Mantener importes precisos en unidades menores, cantidades decimales y reglas explícitas de redondeo. Ampliar el motor más allá del IVA 5/19: tratamientos gravado/exento/excluido/no gravado, descuentos de línea y globales, cargos, impuestos y retenciones. Determinar bases y orden de cálculo según la operación y normativa; el orden ilustrativo del chat no es una fórmula universal.
- Factura, pago y aplicación de un pago a documentos son entidades distintas. Preparar contado/crédito, plazo, vencimiento y medio esperado; después abonos, recibos, saldos, cartera y estados de cuenta. No marcar una factura como pagada por elegir contado ni contabilizar borradores como cartera exigible. Separar valor del documento, retenciones, neto a pagar y saldo.
- Numeración futura por compañía, tipo y ambiente, con resolución/rangos/vigencia donde corresponda. Asignación atómica, sin usar conteo de documentos; prever concurrencia y reintentos idempotentes.
- Mantener aislamiento por compañía en reglas/servidor, no solo filtros de pantalla. Solo superadministradora accede a varias; administrador, facturador y consulta mantienen una sola compañía.
- Integración DIAN al final mediante módulo separado: XML, firma, CUFE/CUDE, validación, respuestas, contenedor, representación PDF y entrega como artefactos diferenciados. Certificados y llaves privadas fuera del navegador; servicio seguro de firma, vencimiento y rotación. Prever cola, consulta de estado, reintentos, conciliación de resultados inciertos y contingencias, sin duplicar documentos.
- Conservar moneda explícita y permitir evolución futura del modelo. Multimoneda, documentos equivalentes, documento soporte y nómina son ampliaciones a evaluar, no funcionalidades prometidas para el MVP. Inventario, compras y contabilidad completa también quedan fuera del alcance actual.

Orden actualizado: completar copias históricas y referencias del modelo junto con condiciones de pago/vencimientos; ampliar cálculos tributarios y descuentos; pagos/abonos/cartera y ajustes relacionados; consultas/exportación; finalmente integración y pruebas DIAN. Revisar presupuesto y capacidades de Spark al definir backend, firma y procesos asíncronos; no activar Blaze sin autorización. Antes de fiscalizar, verificar resoluciones y anexos oficiales vigentes: el chat compartido es orientativo.


## Catálogo publicado — 2026-10-02

Por petición expresa «haz deploy», se compilaron y publicaron firestore:rules y Hosting en facturacion-electronica-a73e3. Compilación de reglas aprobada con advertencias de tipos null en llamadas auditadas de creación. Los seis archivos públicos se verificaron contra dist-release; dist-cloud reconstruido. Se conservan las once pruebas y el recorrido local documentados para esta entrega. No se sembraron datos ni modificaron registros reales. No se desplegaron Functions ni se cambió de plan. Las etapas siguientes del plan continúan pendientes.

## Datos de catálogo y facturas DEMO en nube — 2026-10-05

Por solicitud expresa de crear productos, servicios y facturas, reafirmada con «hazlo con la base de datos de la nube», se ejecutó scripts/seed-demo-catalog.mjs apply contra Firestore real facturacion-electronica-a73e3, exclusivamente en organizations/999000001 (DEMO · Comercial de Pruebas). Se comprobaron compañía y dos clientes DEMO existentes antes de escribir. Alta atómica con precondiciones exists:false: 3 productos, 3 servicios y 3 borradores INVOICE; 9 eventos auditados como carga de sistema autorizada. Ningún registro previo se reemplazó. Lectura posterior comprobó todos los campos de los 18 documentos, incluidos eventos.

Productos: teclado USB 85.000 COP, mouse inalámbrico 55.000 y base para portátil 120.000. Servicios: asesoría administrativa 150.000, soporte técnico 90.000 y capacitación 250.000. Precios antes de IVA; 19 % ilustrativo en estos ejemplos. Totales de borradores: productos 476.000, servicios 690.200 y mixto 208.250 COP. Todos DRAFT, fiscal_validity:false. No se emitió ni transmitió a DIAN y no se requirió deploy. El script tiene vista previa predeterminada y evita duplicar o sobrescribir un conjunto ya existente.


## Modal de productos — 2026-10-05

Crear y editar productos/servicios abre un diálogo modal con campos precargados, título según operación, código inmutable al editar y mensajes de guardado/error dentro del diálogo. Cancelar, Cerrar y Escape descartan la edición; durante el guardado se evita cierre y doble envío. Cambio de compañía reinicia el diálogo. Se conserva la función de persistencia, auditoría y control de versiones existente.

Compilación dist-cloud y dist-release aprobada. Comprobación visual con administrador DEMO conectado a la nube: edición muestra datos de teclado USB; cambio temporal de nombre seguido de Cancelar y reapertura conserva el nombre original, sin escribir datos reales. Evidencia ../modal-producto.png. Hosting publicado por petición expresa «haz deploy» y seis archivos remotos comprobados iguales a dist-release. Sin cambios de reglas.

## Datos históricos y condiciones de pago — local, 2026-10-05

Revisada la nueva conversación compartida https://chatgpt.com/share/6ac3d5e3-891c-83e8-92ff-e0f422f63a3f . La usuaria decidió expresamente mantener DIAN al final y continuar datos históricos y pagos. Este incremento cubre las condiciones previstas del documento; no registra abonos ni genera cartera exigible.

Esquema v2 en borradores Spark: copia de la ficha disponible de emisor y cliente, referencia del cliente, conservación al editar y actualización desde fichas actuales solo mediante opción explícita auditada. Las notas copian el contexto del documento origen. Documentos antiguos permanecen legibles sin sustituir supuestos datos históricos por fichas actuales; al editar conservan contexto nulo salvo captura explícita. Reintentos conservan resultado original y versión; se impide degradar v2 con un cliente antiguo. No se migraron documentos reales.

Contado/crédito, fecha del documento, plazo entero y medio esperado; vencimiento calculado y mostrado tanto en formulario como en vista del documento. Las fechas de calendario se codifican como Timestamp a medianoche UTC y se presentan por sus componentes UTC; hoy se obtiene en zona Colombia. Se mantienen separados de instantes de creación/auditoría. Contado requiere cero días; crédito entre 1 y 3650. Elegir un medio o contado no acredita pago.

Las reglas verifican copias contra fichas, conservación histórica, condiciones y vencimientos en la creación de la auditoría enlazada atómicamente con el borrador. Se mantiene validación incondicional de líneas/importes y permisos en el borrador. Esta distribución evita exceder el presupuesto de expresiones para facturador con tres conceptos, sin omitir validación en ediciones.

16 pruebas aprobadas (tests/audit-edit.test.mjs y tests/payment-terms.test.mjs): controles existentes de acceso/auditoría/importes, copias tras cambiar fichas, refresco explícito, rechazo de copias falsas/eliminadas y degradación de esquema, condiciones incoherentes, notas, legado, reintentos, tres líneas creadas y editadas por facturador, fechas inexistentes, año bisiesto y cambios de mes/año. Build de emuladores aprobado.

Recorrido visual en demo-facturacion: borrador ficticio con fecha 2026-12-31, crédito a 30 días, transferencia, total 119.000 COP. Guardado, vista y reapertura en edición comprobados; vencimiento 2027-01-30, datos copiados y selección de cliente bloqueada mientras se preserva historia. Evidencia ../condiciones-pago.png. Vista local http://127.0.0.1:5500/app.html#nuevo.

Sin deploy ni escrituras en Firebase real. dist-cloud y Hosting conservan versión previa. Para activar esta entrega se requieren reglas y Hosting compatibles juntos y reconstruir dist-cloud tras publicación autorizada. Referencias/unidades de producto y estados separados quedan pendientes en etapa 1; motor tributario ampliado, abonos/cartera e integración DIAN conservan su orden posterior.

## Datos históricos y condiciones publicados — 2026-10-05

Por solicitud expresa «depploy», build real y despliegue de firestore:rules y Hosting completados en facturacion-electronica-a73e3. Reglas compiladas correctamente, con advertencias de tipos null en llamadas de creación auditadas. Los seis archivos públicos se descargaron y compararon byte por byte con dist-release; todos coinciden. dist-cloud reconstruido con la misma versión. Se conserva la evidencia de las 16 pruebas y recorrido en emuladores de esta entrega. No se modificaron registros reales, no se migraron documentos antiguos ni se desplegaron Functions. Condiciones previstas no equivalen a pagos; DIAN continúa pendiente.

## Descuentos e IVA diferenciados — local, 2026-10-05

Por solicitud «sigamos más bien con los descuentos e impuestos», se prioriza etapa 2. Descuento efectivo por concepto, porcentaje 0–100 con dos decimales. Motor con BigInt: importe bruto redondeado a centavos, descuento redondeado a centavos, base neta e IVA redondeado por línea. Conserva clasificación TAXED (5/19), EXEMPT, EXCLUDED y NOT_SUBJECT; los últimos tres tienen importe IVA cero y etiqueta propia. No decide aplicabilidad por producto/cliente ni desarrolla retenciones, INC, ICA, cargos, descuentos globales o condicionados. Catálogo conserva IVA 5/19; en documento se selecciona tratamiento. Revisión contable de casos reales pendiente.

Líneas nuevas conservan tratamiento, porcentaje en puntos básicos, bruto y descuento en centavos. Lectura de líneas antiguas asume descuento cero sin alterar registros; edición recupera valores. Formulario, resumen en vivo y vista del documento desglosan descuento y base neta. Totales siguen siendo preliminares; ninguna emisión o integración DIAN.

Las reglas validan incondicionalmente todas las líneas: primera línea, sumas, esquema y permisos en el borrador; segunda/tercera y contexto/pago en la auditoría exacta requerida por el borrador en la misma escritura atómica. Esto mantiene el límite de expresiones sin omitir verificaciones. No se permite modificar eventos auditados.

27 pruebas aprobadas de dominio, resumen y Firebase: cálculos conocidos, centavos y precisión, descuentos fuera de rango, tratamientos incompatibles, conservación al reabrir/editar, reintentos, importes manipulados, validación de líneas segunda/tercera, nota con descuentos y escritura/edición de tres conceptos por facturador. Build de emuladores aprobado. La revisión visual no se completó: herramienta de navegador rechazó la URL local por su política de acceso; no se intentó eludir el bloqueo. No hay nueva captura visual para esta entrega.

Sin deploy ni escrituras en base real; pruebas en demo-facturacion. dist actualizado, dist-cloud conserva versión publicada. Publicar reglas y Hosting juntos solo ante petición expresa.

Fuentes consultadas para delimitar el cálculo, no para certificar cada operación: DIAN Oficio 5172 de 2020 (https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_5172_2020.htm), descuentos efectivos sin condición y normales según costumbre comercial; Oficio 906767 de 2022 (https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_906767_2022.htm), distinción exento/excluido. Estas categorías no son intercambiables aunque el impuesto calculado sea cero.

## Tablas y modales uniformes — local, 2026-10-05

Por petición de uniformar todos los módulos: tablas compartidas para compañías, clientes, productos/servicios, accesos, registro de usuarios y auditoría; se mantiene la tabla de documentos. Acciones de consulta en modal, edición según permisos y formularios de creación/edición en modales. Compañías ofrece abrir, ver y editar; datos tributarios conserva formulario independiente de registro inicial. Usuarios permite asignar acceso o editar rol; no se añade creación de credenciales ni edición de fichas inmutables. Historial es de solo consulta.

Se reutiliza persistencia, reglas y cálculos existentes. Diálogos nuevos con título accesible, cierre/Escape, error local y bloqueo de cierre durante guardado. Cambio de compañía/sesión cierra los diálogos. Cliente y producto descartan cambios no guardados; formularios se precargan al reabrir. Crear nota y editar documento abren el formulario modal; guardado retorna a documentos.

Build de emuladores aprobado. Recorrido real de interfaz en demo-facturacion: tablas, edición y guardado de factura y ficha de empresa, cancelación de cambio de nombre del cliente y reapertura con nombre original, apertura de edición de rol sin guardar cambios de permisos, creación de producto ficticio UI-TABLA-01, consulta de su ficha, edición desde catálogo, edición de empresa desde listado y tabla de historial. Evidencia ../tablas-uniformes.png. Pruebas existentes de dominio/resumen ejecutadas sin errores. No se escribieron datos reales ni se publicó Hosting; dist-cloud conserva versión publicada. Los descuentos de la entrega anterior siguen requiriendo reglas y Hosting juntos para publicación.

## Descuentos y tablas/modales publicados — 2026-10-05

Autorización expresa «haz deploy». Build real aprobado; firestore:rules y Hosting publicados en facturacion-electronica-a73e3. Compilación de reglas correcta con advertencias null de creación auditada ya conocidas. Se conservan las 27 pruebas de descuentos/reglas y los recorridos visuales de tablas/modales documentados arriba. Los seis archivos remotos coinciden byte por byte con dist-release; dist-cloud reconstruido con la misma versión. No se modificaron datos reales, no hubo migración, no se desplegaron Functions ni se cambió el plan Firebase.

## Menú Documentos publicado — 2026-10-05

Por petición expresa, Hosting publicado con eliminación de Nuevo documento del menú lateral y cambio de Documentos guardados a Documentos. Crear documento permanece en la sección. Build aprobado y seis archivos remotos comparados con dist-release; coinciden. dist-cloud ya actualizado. Sin cambios en reglas ni datos.

## Inicio con Google — local, 2026-10-07

Se agregó «Continuar con Google» al landing mediante Firebase Authentication. La aplicación acepta sesiones creadas con contraseña o `google.com`; cuando el correo verificado ya tiene perfil y asignación conserva la misma compañía y rol. Si es una cuenta nueva, exige completar el perfil antes de entrar. La selección de cuenta se muestra en cada intento y se añadieron mensajes claros para ventana cerrada/bloqueada, dominio no autorizado y cuenta registrada con otro método.

Se comprobó por la API administrativa que Google está habilitado en `facturacion-electronica-a73e3`, con credenciales configuradas, una cuenta por correo y dominios autorizados para localhost y Hosting. Se verificó visualmente la pantalla local y el botón. No se completó una autenticación real porque requiere que la usuaria seleccione su cuenta de Google.

14 pruebas aprobadas: proveedores permitidos, rechazo de proveedores ajenos y pruebas existentes de dominio/cálculos. Build de emuladores aprobado. Evidencia `../inicio-google.png`; vista `http://localhost:5500/`. Sin deploy ni cambios en reglas o datos; dist-cloud y Hosting conservan la versión anterior.

## Inicio con Google publicado — 2026-10-07

Por solicitud expresa «publícalo», se construyó dist-release con la configuración real y se publicó únicamente Firebase Hosting. Firebase confirmó la liberación en `https://facturacion-electronica-a73e3.web.app/` y `https://sigmyp.web.app/`. El aviso posterior de actualización de firebase-tools no afectó la liberación.

Se descargaron `index.html`, `app.html`, `landing.js`, `app.js`, `process-auth.js`, `style.css` y `firebase-config.json` desde ambos dominios con invalidación de caché; los catorce archivos coincidieron byte por byte con dist-release. La revisión visual pública mostró el botón «Continuar con Google» junto al acceso por contraseña. dist-cloud quedó reconstruido con la misma versión. No se publicaron reglas, Functions ni índices y no se modificaron datos.

## Corrección del acceso Google — pendiente de publicación, 2026-10-07

El navegador integrado devolvió `auth/popup-closed-by-user`. Se sustituyó la ventana emergente por `signInWithRedirect`, selección explícita de cuenta y recuperación del resultado al regresar al landing. Esto evita depender de permisos para ventanas emergentes y conserva el enrutamiento por perfil, correo verificado, compañía y rol.

Las 14 pruebas y los builds dist-release/dist-cloud aprobaron. El primer intento de publicación fue rechazado porque expiró la sesión de Firebase CLI. La reautorización llegó al consentimiento de Google «Vas a volver a iniciar sesión en Firebase CLI» para `danielao@grupodyd.com`; requiere que la propietaria pulse «Continuar». La corrección todavía no está publicada. La versión pública anterior permanece activa y no se modificaron reglas ni datos.

### Publicación de la corrección

La propietaria completó la reautorización de Firebase CLI como `danielao@grupodyd.com`. Hosting se liberó correctamente en `facturacion-electronica-a73e3.web.app` y `sigmyp.web.app`. Se descargaron siete archivos desde cada dominio y los catorce coincidieron byte por byte con dist-release; el bundle público contiene el mensaje de redirección y ya no contiene `signInWithPopup` en el landing.

Recorrido público comprobado: «Continuar con Google» muestra el aviso de salida, reemplaza la página completa y llega al selector real de cuenta de Google con retorno configurado a Firebase Authentication. No se seleccionó una cuenta durante la comprobación final para evitar entrar en nombre de la usuaria. No se publicaron reglas, Functions o índices y no se modificaron datos.

## Sigmyp como dominio principal — 2026-10-07

Por instrucción de la usuaria, `https://sigmyp.web.app` queda como dirección principal. Landing y aplicación detectan el Hosting anterior y lo reemplazan por Sigmyp, conservando ruta, consulta y hash. Se actualizaron enlaces vigentes de README, plan y salida del generador de cuentas DEMO.

Cuatro suites aprobaron, incluida la conservación de ruta/consulta/hash y la ausencia de redirección en Sigmyp o localhost. Hosting se liberó en ambos sitios. Siete archivos descargados desde cada dominio coincidieron byte por byte con dist-release y dist-cloud se reconstruyó. Recorrido público desde una URL antigua de `app.html` llegó a `https://sigmyp.web.app/?section=productos`, conservando el destino solicitado. Sin cambios en reglas, Functions, índices o datos.

## Retorno OAuth de Sigmyp — pendiente, 2026-10-07

La configuración pública ya usa `authDomain: sigmyp.web.app`, según la opción recomendada por Firebase para subdominios `web.app`. La prueba real alcanzó el handler del mismo dominio, pero Google devolvió `Error 400: redirect_uri_mismatch`: todavía falta registrar exactamente `https://sigmyp.web.app/__/auth/handler` en el cliente OAuth web `550369833406-msc7cu15g7jai578uhu62e2v389fnmb6`.

Se abrió directamente el cliente en Google Cloud Console. La organización exige reautenticación con contraseña de `danielao@grupodyd.com` antes de permitir la edición; ese paso debe completarlo la propietaria en la pestaña «Demuestra que eres tú». Hasta entonces Google no puede completar el ingreso. El acceso con contraseña de la aplicación permanece disponible.

### OAuth de Sigmyp corregido y validado

La propietaria completó las verificaciones de Google Cloud. El cliente OAuth web conserva `https://facturacion-electronica-a73e3.firebaseapp.com` y su handler, y ahora incluye el origen `https://sigmyp.web.app` y la URI exacta `https://sigmyp.web.app/__/auth/handler`. Se recargó el formulario después de guardar y ambos valores persistieron.

Prueba real completa aprobada inmediatamente después: el botón Google abrió el selector con `context_uri` y `redirect_uri` de Sigmyp, aceptó `danielao@grupodyd.com`, regresó a `https://sigmyp.web.app`, recuperó la sesión Firebase y abrió `app.html#documentos`. La aplicación reconoció acceso global y cargó Qanty, DYD y DEMO. Ya no apareció `redirect_uri_mismatch`. dist-cloud se reconstruyó con `authDomain: sigmyp.web.app`. No se cambiaron reglas, Functions, índices ni datos.

## Limpieza de mensajes técnicos — local, 2026-10-07

Por solicitud de la usuaria se retiraron menciones visibles a Firebase, nube, Spark y emuladores. El pie lateral queda en «Gestión empresarial · Sigmyp»; el estado superior muestra «Borradores» y el entorno aislado «Entorno de prueba». Confirmaciones de empresa, cliente y borrador ahora describen solo la acción realizada. Los errores de configuración y acceso usan lenguaje funcional y las ayudas de recuperación omiten detalles de infraestructura.

Se conservaron importaciones, rutas de configuración, nombres de variables y comentarios internos necesarios para el funcionamiento. Las cuatro suites seleccionadas aprobaron 16 casos y los builds de emuladores y dist-cloud terminaron correctamente. Vista local conectada a datos reales disponible en `http://127.0.0.1:5504/`. Sin deploy; la versión pública todavía conserva los textos anteriores.

### Limpieza publicada

Por solicitud «sube a firebase todos los cambios de una vez», se construyó dist-release y se publicó únicamente Hosting en ambos sitios configurados. Firebase confirmó la liberación. Los siete archivos principales descargados desde cada dominio coincidieron byte por byte con dist-release; la búsqueda sobre los bundles públicos confirmó la ausencia de las frases técnicas retiradas.

Recorrido real autenticado en `https://sigmyp.web.app/app.html#documentos`: estado superior «Borradores», pie lateral «Gestión empresarial · Sigmyp», sesión y tres compañías cargadas. No aparecen menciones visibles a Firebase o nube en esta pantalla. No se desplegaron reglas, Functions o índices y no se modificaron datos.

## Retiro de indicadores de desarrollo — local, 2026-10-07

Por solicitud de la usuaria se ocultó el indicador «Borradores» del encabezado y se retiraron la etiqueta «EN DESARROLLO» y el pie «Primera etapa: empresas y borradores / Próxima etapa: motor tributario y XML UBL». Se conserva el aviso funcional de que los documentos actuales no tienen validez fiscal, ya que describe una limitación vigente del sistema.

Las cuatro suites seleccionadas aprobaron y los builds `dist` y `dist-cloud` terminaron correctamente.

### Nombre completo de SIGMYP

La usuaria confirmó que SIGMYP significa «Sistema Integrado de Gestión para Micro y Pequeñas Empresas». Se actualizó localmente el título del navegador, el encabezado y el pie de la página de acceso, el encabezado del espacio de trabajo y el README. «Sigmyp» se conserva como nombre corto y el dominio no cambia.

### Publicación y preferencia de despliegue continuo

Por instrucción «sigue publicando todo en firebase, haz deploy cada que hagas un cambio», esta entrega se publicó en Firebase Hosting y queda registrada la preferencia de publicar cada cambio terminado después de validarlo. Las 16 pruebas aprobaron. Firebase liberó ambos sitios configurados y los siete archivos principales descargados de cada dominio coincidieron byte por byte con `dist-release`.

Esta entrega solo cambió la interfaz. No se desplegaron reglas, Functions o índices y no se modificaron datos. La autorización de publicación continua no incluye operaciones masivas o destructivas sobre datos reales.

## Retiro del banner de estado fiscal — 2026-10-07

Por solicitud de la usuaria se retiró el banner persistente que explicaba que el módulo guarda borradores sin validez fiscal y que la firma, emisión y validación DIAN no están disponibles. La limitación se conserva en la documentación interna y en el modelo funcional para evitar tratar los borradores como documentos fiscales; ya no se comunica mediante un banner general.

Durante la revisión posterior se detectó el mismo aviso en la página de acceso y también se retiró para aplicar la preferencia visual de manera uniforme.

Las 16 pruebas aprobaron y Firebase Hosting se liberó en ambos sitios configurados. El `app.html` descargado de cada dominio coincidió con `dist-release`; la revisión visual pública confirmó que el banner ya no aparece. `dist-cloud` quedó actualizado. No se desplegaron reglas, Functions o índices y no se modificaron datos.

## Mapa de procesos en página completa — 2026-10-07

Por solicitud de la usuaria se eliminó el mapa incrustado dentro de una sección de la aplicación. La opción «Mapa de procesos» ahora abre `/procesos/index.html` como página completa y el encabezado ofrece «Volver a SIGMYP». El diseño de escritorio se compactó para ocupar una sola altura de pantalla sin desplazamiento interno; las pantallas pequeñas mantienen el flujo responsivo con desplazamiento de la página cuando sea necesario.

El control de acceso directo acepta a la superadministradora mediante su claim y a usuarios cuya asignación única corresponde a DyD. No se cambiaron permisos de Firestore ni datos.

En la misma entrega se retiró de Control documental de Recursos Físicos/SG-SST la nota editorial sobre la hoja `Procedimiento_Rec.Físicos_V.3`, la versión de 2018 y la correspondencia de las siete actividades.

### Publicación y comprobación

Seis suites relacionadas aprobaron y el build real terminó correctamente. La batería completa no se tomó como criterio porque cinco suites antiguas dependen de una combinación incompatible de Node 18, `jwks-rsa` y la versión ESM de `jose`; el fallo ocurre al cargar las dependencias y no en el código modificado.

Firebase Hosting se liberó en ambos sitios. Los siete archivos relevantes descargados de cada dominio coincidieron byte por byte con `dist-release`. La revisión pública autenticada abrió directamente `/procesos/index.html`, mostró el enlace «Volver a SIGMYP» y confirmó que el documento no tiene desplazamiento vertical en el viewport revisado: `scrollHeight` e `innerHeight` fueron 1012 px. No se desplegaron reglas, Functions o índices y no se modificaron datos.

### Corrección: mapa dentro de SIGMYP

La usuaria aclaró que el mapa debe permanecer dentro de la opción «Mapa de procesos» de la aplicación, como los demás módulos. Se restauró la sección integrada y su navegación por hash. El iframe ocupa la altura disponible y el documento interno usa una composición más compacta para no mostrar desplazamiento en escritorio. La página directa se conserva como ruta protegida secundaria.

La corrección se publicó en ambos sitios de Hosting. Seis suites relacionadas aprobaron y siete archivos relevantes descargados de cada dominio coincidieron byte por byte con `dist-release`. En la comprobación pública autenticada se seleccionó DyD y se abrió `#procesos`: el menú quedó minimizado, los nueve procesos aparecieron simultáneamente, el documento exterior reportó `overflow:hidden` y el iframe visible midió 805 px en un viewport de 896 × 1012. No se observaron barras internas. Sin cambios en reglas, Functions, índices o datos.

### Desplazamiento general restaurado

La usuaria detectó que el bloqueo de `overflow` impedía desplazar la página general. Se cambió el documento exterior a `overflow-y:auto`; el iframe conserva su composición ajustada y sin barra interna.

La revisión pública mostró además que la clase compacta se heredaba en las caracterizaciones abiertas dentro del iframe. Se limitó ese modo al índice `process-map-page`; las páginas de detalle recuperan su desplazamiento vertical normal.

La corrección se publicó en los dos sitios configurados de Firebase Hosting. Seis suites relacionadas, con veinte subpruebas, aprobaron; el build real finalizó correctamente y los cuatro archivos relevantes de cada dominio coincidieron con `dist-release`. En `sigmyp.web.app` se abrió la caracterización de Gestión Comercial desde el mapa integrado y se desplazó hasta el pie y los controles de actividad, confirmando el funcionamiento del scroll interno. La portada del mapa conserva su vista compacta. No se modificaron reglas, Functions ni datos.

### Legibilidad, menú y entrada inicial del mapa

La portada integrada dejó de comprimirse a una altura pequeña: el panel tiene una altura de escritorio de 960 px y aumentaron tipografía, iconos, espacios y títulos. El desplazamiento se hace en la página general. El menú se minimiza una vez al entrar a `#procesos`, pero el estado ya no se fuerza con CSS; su botón permite abrirlo y cerrarlo durante la consulta.

El acceso terminado sin una sección explícita solicita `#procesos`. Un usuario de una sola compañía entra al mapa cuando su asignación corresponde a DyD. La superadministradora conserva la selección obligatoria de compañía y al abrir DyD es dirigida al mapa; otras compañías abren Facturación porque no tienen el módulo de procesos de DyD.

El rol de compañía `admin` se presenta como «Administrador» en el selector, las tablas, los detalles y la auditoría. Sus permisos existentes permiten consultar y gestionar todos los módulos de su única compañía, incluida la administración de accesos y el historial, sin acceso a otras organizaciones.

Seis suites relacionadas aprobaron y los builds `dist-release` y `dist-cloud` finalizaron correctamente. Firebase Hosting se publicó en sus dos sitios. La revisión pública confirmó el mapa ampliado, el menú abierto y cerrado desde `#procesos`, la entrada a DyD en el mapa y «Administrador» en la tabla real de usuarios. No se modificaron reglas, Functions ni datos.

### Superadministrador visible y menú uniforme

La membresía local de la cuenta conectada ya no oculta visualmente su permiso global. Cuando la claim `platformAdmin` está activa, el encabezado y la fila de la cuenta muestran «Superadministrador · acceso global», el detalle indica alcance sobre todas las compañías y no ofrece editar ni retirar ese permiso desde el selector común. La protección y el modelo de datos no cambiaron.

Se retiró el cierre automático del menú al abrir `#procesos`. El mapa conserva el mismo estado abierto o minimizado que eligió la persona en los demás módulos. La comprobación pública mostró el menú abierto dentro del mapa, el distintivo global y las tres compañías disponibles para la cuenta superadministradora. Veinte subpruebas aprobaron, ambos sitios de Hosting se publicaron y `dist-cloud` quedó actualizado. No se modificaron reglas, Functions ni datos.

### Texto proporcional en las tarjetas del mapa

Las etiquetas de los procesos ahora calculan su tamaño desde el ancho de cada tarjeta mediante unidades de contenedor, con un mínimo de 14 px y máximo de 18 px. Los iconos acompañan el crecimiento. Esto evita textos pequeños rodeados de espacio vacío en monitores amplios, sin desbordar las tarjetas estrechas. Se actualizó la versión del enlace a `styles.css` para que los navegadores no conservaran la regla anterior.

La comprobación pública usó una ventana de 1440 × 1000: una tarjeta de 258 px mostró texto de 14 px; las tarjetas más anchas pueden crecer progresivamente hasta 18 px. Tres suites relacionadas aprobaron, ambos sitios de Hosting fueron publicados y `dist-cloud` quedó actualizado. No se modificaron reglas, Functions ni datos.

### Contenido completo en cada proceso

Las caracterizaciones dejaron de heredar la altura fija y el recorte vertical usados por la portada compacta del mapa. Cada ficha usa altura automática y desplazamiento vertical dentro del panel integrado, por lo que actividades, documentos, indicadores, recursos y controles inferiores permanecen accesibles. Se actualizó la versión pública de `caracterizacion.css` para invalidar la caché anterior.

La comprobación local de Gestión Comercial midió 1.374 px de contenido dentro de una ventana de 720 px y confirmó desplazamiento desde 0 hasta el máximo de 654 px. Tras publicar, la misma ficha integrada midió 1.424 px dentro de un panel de 958 px y alcanzó su final en 466 px de desplazamiento. Tres suites relacionadas aprobaron y ambos sitios de Hosting se actualizaron. No se modificaron reglas, Functions ni datos.

## Menú de cuenta y perfil — 2026-10-07

Se reemplazó el botón aislado de cierre de sesión por un menú de cuenta en la esquina superior derecha. El avatar muestra nombre, correo y rol, y ofrece Mi perfil, Datos de la empresa, Usuarios y permisos y Cerrar sesión. Las opciones de compañía aparecen solo cuando existe una compañía activa; Usuarios y permisos y el engranaje respetan los permisos de Superadministrador y Administrador.

La ficha Mi perfil reúne nombres, apellidos, correo, identificación, teléfono, cargo, rol, compañía activa, alcance, método de acceso y estado de verificación. La revisión pública con la cuenta superadministradora confirmó la ficha completa y las opciones contextuales al seleccionar DyD. Cuatro suites relacionadas aprobaron. No se cambiaron reglas, Functions ni datos.

### Menú de cuenta sin opciones repetidas

Por indicación de la usuaria se retiró el engranaje del encabezado. También se eliminaron Datos de empresa y Usuarios y permisos del menú lateral; ambas opciones permanecen únicamente en el menú del avatar y conservan sus condiciones de compañía y rol. La navegación por hash abre las pantallas directamente sin depender de botones laterales ocultos.

Cuatro suites relacionadas aprobaron y el build finalizó correctamente. La revisión pública confirmó que no existen el engranaje ni los dos accesos laterales duplicados, y que Datos de empresa y Usuarios y permisos abren correctamente desde el avatar. Ambos sitios de Hosting fueron publicados. No se cambiaron reglas, Functions ni datos.

## Pausa temporal de Facturación, Productos y Facturador — 2026-10-07

Por solicitud de la usuaria se ocultaron para todos los roles los accesos laterales de Facturación y Productos y servicios. Las rutas `documentos`, `nuevo` y `productos` también quedaron deshabilitadas, de modo que no pueden abrirse escribiendo el hash directamente. El código y los datos permanecen intactos para retomarlos más adelante.

Facturador dejó de aparecer entre los roles asignables. Las asignaciones `billing` existentes no se eliminaron ni migraron; se presentan como «Acceso anterior» para que una administradora pueda identificarlas y cambiarlas de forma explícita. Al abrir DyD se conserva el Mapa de procesos; las demás compañías abren Datos de empresa.

Seis suites relacionadas aprobaron y el build finalizó correctamente. La revisión pública confirmó la ausencia de ambos accesos laterales y de Facturador en el selector; DyD abrió Mapa de procesos y Qanty abrió Datos de empresa. Ambos sitios de Hosting fueron publicados. No se cambiaron reglas, Functions ni datos.

## Vista centrada en el mapa de procesos — 2026-10-07

Se ocultó Clientes y se bloqueó su ruta directa, conservando su código y datos. También se retiró visualmente toda la barra lateral; el área principal ahora ocupa el ancho completo y mantiene en el encabezado el menú del avatar. La Superadministradora conserva la selección inicial de compañía y las opciones administrativas del menú de cuenta.

Veinte subpruebas aprobaron y el build finalizó correctamente. La revisión pública confirmó barra lateral con `display:none`, contenido principal sin margen y ocupando todo el viewport, ausencia de Clientes y apertura de DyD en Mapa de procesos. Ambos sitios de Hosting fueron publicados. No se cambiaron reglas, Functions ni datos.

### Mapa sin encabezado exterior repetido

Se ocultó en la vista `#procesos` el bloque exterior con el título «Mapa de procesos» y su descripción. El diagrama comienza directamente debajo de la barra superior; las demás vistas conservan sus encabezados. Tres suites relacionadas aprobaron. No se cambiaron reglas, Functions ni datos.

## Rediseño corporativo del mapa de procesos — 2026-10-07

El índice del mapa adoptó la identidad visual de DyD a partir de la referencia entregada: fondo carbón, acentos vino tinto y plateado, marca visible en blanco y jerarquía más marcada entre entradas, grupos de procesos y valor generado. El logo y el nombre de Dinámica y Desarrollo forman la cabecera interna del mapa.

La distribución usa el espacio horizontal con procesos misionales en cuadrícula 2×2. Los procesos de apoyo usan dos columnas y Gestión Financiera ocupa el ancho completo, evitando cortes en pantallas medianas. Las tarjetas mantienen iconos, nombres y enlaces existentes; las caracterizaciones no cambiaron.

La revisión visual local se realizó en un viewport de 848 × 1.012 px y confirmó los nueve procesos completos, logo legible y textos sin recortes visibles. No se cambiaron reglas, Functions ni datos.

### Historial exclusivo de Superadministrador

El botón «Historial de cambios de la empresa» ahora solo aparece cuando la cuenta tiene el rol global Superadministrador y existe una compañía activa. Administrador ya no visualiza ese acceso. Los demás permisos del rol no cambiaron. Ocho subpruebas aprobaron y el paquete final contiene 38 archivos, sin el archivo temporal de revisión visual. No se cambiaron reglas, Functions ni datos.

### Marca DyD y desplazamiento único del mapa — 2026-10-07

La cabecera principal incorpora el logo de Dinámica y Desarrollo en la esquina superior izquierda y conserva la paleta vino tinto, negro y plateado. El contenedor del mapa perdió borde, fondo, redondeo y altura rígida para integrarse con la página.

El panel de procesos calcula su altura al cargar el índice y cada caracterización. El documento interior mantiene oculto su desplazamiento vertical y las fichas integradas omiten su cabecera duplicada; toda la navegación usa la barra de desplazamiento de la página principal.

La comprobación pública en Sigmyp confirmó el logo a 38 px del borde izquierdo, el contenedor del mapa sin borde ni radio, y un índice de 960 px cuyo alto interior coincide exactamente. Al abrir Gestión Comercial, el panel creció de 960 a 1.314 px; la página exterior pasó a 1.529 px de contenido y conservó `overflow-y: auto`, mostrando una sola barra de desplazamiento. Las cuatro suites relacionadas aprobaron. Ambos sitios de Hosting fueron publicados y `dist-cloud` quedó actualizado. No se modificaron reglas, Functions ni datos.

## Paleta corporativa integral — 2026-10-07

Se creó una capa visual compartida para el índice del mapa y las nueve caracterizaciones. Toda la experiencia usa fondos blancos, transparencias, negro, grises y vino tinto; el mapa dejó el fondo carbón y las fichas retiraron los acentos azules y verdes heredados. Producción y SG-SST también consumen la misma capa después de sus estilos particulares.

El encabezado principal y la marca interna del mapa usan la versión del logo DyD sobre fondo blanco. La aplicación general actualizó barra lateral, navegación, avisos, tarjetas, diálogos y superposiciones para evitar fondos negros y colores ajenos a la paleta.

La auditoría visual revisó el mapa, Gestión Comercial y la variante de Gestión de Producción. Se corrigió el contraste de las tarjetas estratégicas, el rótulo heredado en turquesa y el título del paso activo. Un barrido de colores calculados sobre las caracterizaciones Comercial y Producción no encontró azules, verdes ni otros acentos fuera de la paleta; el barrido de la aplicación general tampoco encontró colores ajenos, salvo un tono vino translúcido válido.

## Integración del logo SIGMYP — 2026-10-07

El logo proporcionado por la usuaria se incorporó sin modificar como `web/logo-sigmyp.png`. Se muestra como marca principal en el encabezado del inicio de sesión, la cabecera de la aplicación y la barra lateral. El archivo conserva su transparencia y se presenta sobre fondo blanco dentro de un recorte visual adaptable, sin deformar sus proporciones.

La identidad DyD permanece dentro del mapa de procesos y sus caracterizaciones; SIGMYP identifica el sistema completo y DyD identifica el contenido de la compañía.

La revisión visual confirmó el logo completo y legible sobre blanco en la cabecera de la aplicación y en la portada. Se retiró el rótulo textual repetido de la portada porque la expansión del nombre ya forma parte del logo entregado.

## Regreso al mapa desde el menú de usuario — 2026-10-07

Las vistas Datos de la empresa y Usuarios y permisos muestran un botón «Volver al mapa de procesos» cuando DyD es la compañía activa. Mi perfil incorpora el mismo regreso dentro de su modal. El botón no aparece para compañías sin acceso al mapa y conserva la validación de navegación existente.

La comprobación pública con DyD activa confirmó el regreso visible en Datos de empresa y Usuarios y permisos. En Mi perfil aparece dentro del modal. El botón de Datos de empresa regresó correctamente a `#procesos`; Usuarios y permisos mostró el mismo control. Ocho subpruebas aprobaron y ambos sitios de Hosting fueron publicados. No se modificaron reglas, Functions ni datos.

### Encabezado del mapa sin logo DyD — 2026-10-07

Se retiró el bloque de marca Dinámica y Desarrollo que aparecía junto al título «Mapa de procesos». El título y los indicadores de grupos/procesos ocupan ahora todo el ancho del encabezado, con composición adaptable en pantallas pequeñas. La marca SIGMYP permanece en la cabecera principal.

La revisión pública confirmó un encabezado compacto sin el logo DyD ni espacio residual: título e instrucción quedan a la izquierda y los indicadores «03 grupos / 09 procesos» a la derecha. El logo SIGMYP continúa en la cabecera general. Ocho subpruebas aprobaron y ambos sitios de Hosting fueron actualizados.

### Rol dentro del menú del usuario — 2026-10-07

El distintivo permanente de rol se ocultó del área de contenido. El nombre del permiso se presenta dentro del menú del avatar con el formato «Rol · [nombre del rol]», debajo del nombre y correo del usuario.

### 7 de octubre de 2026 · Ajuste de altura y aprovechamiento de filas en caracterizaciones

Se eliminó el mínimo artificial de altura del iframe y la altura heredada del visor en las fichas. El marco integrado ahora mide el borde inferior real del contenido después de cargar tipografías y al cambiar de pestaña, manteniendo un único desplazamiento exterior. Las cuadrículas de dos columnas hacen que la última tarjeta ocupe la fila completa cuando el total es impar. La comprobación local en Planeación mostró 1389 px de marco frente a 1388 px de contenido (1 px de redondeo), sin franja vacía; en Recursos Físicos, «Cliente» ocupa ambas columnas. Cuatro suites aprobaron. Ambos sitios de Hosting fueron publicados y sus recursos críticos coincidieron con `dist-release`. La comprobación pública mostró 1413 px de marco frente a 1412,77 px de contenido (diferencia redondeada 0).

### 7 de octubre de 2026 · Auditoría completa de espacios en procesos

Después de publicar el ajuste de altura se recorrieron los nueve procesos y 147 estados de interfaz, incluyendo todas las pestañas, todas las actividades y las tres caracterizaciones de Producción. Se verificaron recorte vertical, espacio final mayor de 2 px, desbordamiento horizontal y última tarjeta sin ocupar la fila completa cuando la cantidad es impar. Resultado: 0 hallazgos en Planeación, Mejora continua, Comercial, Desarrollo, Compras, Producción, Talento Humano, SG-SST y Financiera. No fueron necesarios cambios adicionales ni una nueva publicación.
