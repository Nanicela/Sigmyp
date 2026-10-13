# Plan de construcción y habilitación

Actualizado: 13 de octubre de 2026. Plan vigente; sustituye el orden del 28 de septiembre. Las evidencias de cada entrega están en [VALIDACION.md](VALIDACION.md) y el diseño de la ampliación está en [MODERNIZACION_SIGMYP.md](MODERNIZACION_SIGMYP.md).

## Objetivo y decisiones

Construir con Vue 3 y Firebase un sistema integrado de gestión para varias compañías. La versión nueva incorpora de manera gradual los recorridos útiles del SIGMYP anterior: clientes, cotizaciones, compras, inventario, producción, soporte, cartera e indicadores. Después se preparará el software y la empresa para el proceso oficial de proveedor tecnológico DIAN. La empresa está constituida y la usuaria declara cumplir requisitos patrimoniales; sus soportes no han sido auditados.

- Mantener Spark por ahora. No activar facturación ni servicios de pago sin autorización.
- Desarrollar localmente conectado a Firebase real cuando las reglas publicadas sean compatibles. Usar emuladores para pruebas y datos ficticios. Publicar solo por petición expresa.
- Solo superadministradora puede acceder a varias compañías. Administrador, facturador y consulta pertenecen a una sola, seleccionada automáticamente.
- Mantener la integración DIAN para la última etapa; preparar desde ahora los datos y límites entre componentes que necesitará.
- El alcance incluye los módulos observados en el SIGMYP anterior: comercial, compras, inventario, producción, soporte/activos, finanzas e indicadores. Nómina, bancos y contabilidad de doble partida requieren una definición independiente.
- Se asumen diez compañías iniciales. Volumen mensual, concurrencia, presupuesto operativo y fecha objetivo siguen por definir; no bloquean el siguiente incremento local.
- La interfaz se migra a Vue 3 y Vite sin cambiar colecciones, reglas ni datos. Durante la transición se conserva una capa de compatibilidad con la lógica validada; cada módulo se reemplazará de forma gradual y solo se retirará esa capa cuando exista paridad demostrada.

## Estado real de los avances

| Área | Estado al actualizar este plan | Límites actuales |
|---|---|---|
| Firebase y publicación | Authentication, Firestore y Hosting en facturacion-electronica-a73e3 | Cloud Functions no desplegadas; Spark |
| Usuarios y acceso | Registro de ficha, correo/contraseña, recuperación y sesión persistente; roles y compañía única publicados | Revisar permisos al incorporar cada operación |
| Compañías y clientes | Fichas, edición, listado/modal y selección de cliente en documentos publicados | Validaciones tributarias y catálogos oficiales incompletos |
| Documentos | Borradores de factura y notas, edición permitida según bloqueo, historial, filtros, tabla y vista visual publicados | Sin emisión fiscal; notas no liquidan saldos |
| Cálculos | Resumen en vivo, centavos enteros, validación de importes y reintentos | COP, hasta tres conceptos, IVA 5/19; sin descuentos ni retenciones |
| Catálogo | Crear/editar/buscar/desactivar y selección en conceptos publicados el 2026-10-02 | Reglas y Hosting publicados; sin existencias |
| Copias históricas | Copias de las fichas completas disponibles de emisor/comprador y referencia de cliente publicadas en esquema v2 el 2026-10-05 | Pendientes referencia/código/unidad de producto; datos tributarios limitados por las fichas actuales |
| Condiciones de pago | Contado/crédito, fecha, plazo, vencimiento y medio esperado publicados el 2026-10-05 | No registra pagos |
| Pagos y cartera | Pendientes | Contado no equivale automáticamente a pagado |
| DIAN | Pendiente | Sin XML fiscal, firma, CUFE/CUDE, numeración fiscal, transmisión ni habilitación |
| Referencia SIGMYP anterior | Código seguro inventariado localmente: 44 modelos, 182 rutas y 201 recursos públicos | Se usa para comprender recorridos; no se copiarán su base de datos, secretos ni arquitectura antigua |
| Migración Vue | Acceso, mapa, cabecera, selector de compañía, datos de empresa y usuarios/permisos migrados | Falta centralizar estado y migrar los módulos operativos |

Los documentos actuales son borradores sin validez fiscal. La vista visual no equivale a PDF fiscal ni el guardado en Firestore a expedición de factura.

## Etapas y criterios de terminación

### 1. Datos históricos y condiciones de pago — en curso

- Definir versión del esquema y conservar referencias a cliente/producto junto con copias de los datos de emisor, comprador y conceptos aplicables al documento.
- Incorporar código y unidad de producto, evitando que editar una ficha cambie documentos guardados. En un borrador, actualizar estos datos debe ser una acción explícita y auditada.
- Distinguir contado/crédito, plazo, fecha base, vencimiento y medio esperado de pago. Definir fechas de calendario y zona Colombia por separado de instantes de auditoría; no convertir indiscriminadamente toda fecha a milisegundos.
- Definir cómo se muestran documentos antiguos sin inventar datos históricos desde fichas actuales. Mantener lectura compatible; no migrar masivamente datos reales como parte implícita del cambio.
- Preparar estados separados de preparación, fiscal, entrega, comercial y pago; no simular validación DIAN.

**Avance local del 5 de octubre:** esquema v2, copia de las fichas disponibles de empresa/cliente, conservación al editar, actualización explícita y auditada, tratamiento de documentos antiguos sin inventar copias, condiciones y vencimientos. Pendientes código/unidad/referencia de producto y diseño de estados separados. Reglas y Hosting publicados juntos el 5 de octubre por solicitud expresa; dist-cloud actualizado.

**Criterio de terminación:** cambiar cliente, empresa o catálogo no altera la representación histórica; edición del borrador controlada y auditada; vencimientos correctos en cambios de mes/año; documentos antiguos legibles; reglas rechazan escrituras inconsistentes y acceso entre compañías. Demostración local con datos ficticios.

### 2. Motor de importes, impuestos y descuentos — prioridad actual

**Avance local del 5 de octubre:** por instrucción de la usuaria se adelanta esta etapa sobre los pendientes de referencias/unidades y estados. Descuento efectivo porcentual por concepto, base neta e IVA 5/19; exento/excluido/no gravado diferenciados en documentos. Guardado, edición y vista compatibles con líneas antiguas. Pendiente revisión contable de cobertura; retenciones, cargos, descuentos globales y otros impuestos aún no implementados. Publicado junto con tablas y modales uniformes el 2026-10-05; reglas y Hosting verificados, dist-cloud actualizado.

- Ampliar el cálculo a descuentos por línea y globales, cargos y tratamientos tributarios diferenciados: gravado, exento, excluido y no gravado.
- Incorporar otros impuestos y retenciones por cobertura definida; distinguir subtotal, impuestos, retenciones, valor del documento y neto a pagar.
- Establecer precisión, bases y redondeos por operación. No tomar la secuencia ilustrativa del chat compartido como regla fiscal universal.
- Revisar cómo ampliar el límite de tres conceptos conservando validación confiable. Si se requiere backend de pago, presentar alcance/costo antes de cambiar Spark.

**Criterio de terminación:** casos de cálculo documentados y revisados con contador, pruebas de combinaciones y redondeo, rechazo de importes manipulados y trazabilidad entre reglas de negocio, código y pruebas. Consultar fuentes oficiales vigentes al implementar tratamientos fiscales.

### 3. Datos maestros y operación comercial

- Migrar Clientes a Vue e incorporar contactos y sedes.
- Implementar cotizaciones, versiones, vigencia, estados y trazabilidad.
- Incorporar proveedores, contactos y órdenes de compra con aprobación y recepción.

**Criterio de terminación:** datos aislados por compañía, permisos por acción, estados auditados y recorridos completos en Vue.

### 4. Inventario, producción y soporte

- Diseñar ítems, categorías, ubicaciones, movimientos, existencias y seriales.
- Incorporar productos, materiales, procesos, recursos, órdenes de producción y remisiones.
- Incorporar activos instalados, casos de soporte, respuestas, soluciones y tiempos de atención.

**Criterio de terminación:** movimientos y reversos consistentes, concurrencia probada, trazabilidad desde compra hasta consumo/entrega y tickets asociados a activos.

### 5. Ajustes, pagos, abonos y cartera

- Completar motivos, relación con factura origen y ajustes parciales/totales de notas. Distinguir preparar una nota de aplicar sus efectos económicos.
- Crear pagos y aplicaciones de pagos como registros separados: fecha, importe, medio, referencia y usuario responsable.
- Incorporar abonos, reversos auditados, recibos, saldo y estados de cuenta; tratar excedentes y concurrencia explícitamente.
- Excluir borradores de cartera exigible. Hasta contar con emisión, mostrar los recorridos como simulaciones o proyecciones claramente identificadas.

**Criterio de terminación:** pagos parciales y múltiples calculan saldos consistentes; reintentos no duplican abonos; ajustes no se aplican dos veces; reversos conservan historia; operaciones restringidas por rol y compañía. La expedición de notas fiscales sigue pendiente de la etapa DIAN.

### 6. Consulta, indicadores y operación cotidiana

- Consultas y exportaciones con filtros, paginación, vencimientos y saldos; representación imprimible coherente con las copias históricas.
- Mejorar búsqueda, mensajes de error y estados vacíos según los flujos completados.
- Completar recuperación, respaldo/restauración probados, seguimiento de errores, cuotas y pruebas de concurrencia/carga según volumen acordado.
- Revisar cobertura funcional por recorrido frente a referencias como Siigo, registrando diferencias; no afirmar equivalencia completa sin comprobarla.

**Criterio de terminación:** cada rol completa sus recorridos permitidos; exportaciones coinciden con datos/criterios consultados; pruebas de aislamiento, recuperación y errores documentadas. Ninguna salida se presenta como fiscal antes de implementar emisión.

### 7. Integración DIAN y habilitación — última etapa

1. Verificar normativa y anexos oficiales vigentes, versiones y requisitos diferenciados para el software y la autorización de la empresa como proveedor tecnológico. Organizar matriz requisito → implementación → prueba → evidencia.
2. Definir infraestructura y presupuesto del procesamiento seguro. Numeración atómica por compañía/tipo/ambiente, resolución y rangos cuando correspondan; no usar conteo de documentos ni inventar parámetros oficiales.
3. Generar XML, identificadores CUFE/CUDE y firma según especificaciones aplicables. Mantener llaves privadas en servidor y separar XML fuente, firmado, respuesta, contenedor y representación gráfica.
4. Integrar envío y consulta mediante módulo DIAN separado; conservar documento exacto, intentos y respuestas. Resolver resultados inciertos consultando y conciliando antes de repetir; prever contingencias.
5. Completar entrega y eventos aplicables, preservación del documento fiscal y correcciones relacionadas. Separar aceptación/validación fiscal, entrega, estado comercial y pago.
6. Ejecutar pruebas oficiales asignadas, reunir soportes y completar el trámite aplicable. Paso a producción solo con resultados y autorizaciones oficiales que correspondan.

**Criterio de terminación:** validaciones técnicas y criptográficas, pruebas de fallos/reintentos, resultados oficiales de habilitación y autorización aplicable documentados. Un set de pruebas superado no se presenta por sí solo como autorización del proveedor.

## Arquitectura y datos

La aplicación Spark actual usa SDK web con Authentication y Firestore; las reglas verifican acceso e importes. Existe código de Functions para emuladores, pero no es el backend de producción activo. La arquitectura futura incorporará operaciones confiables de servidor, procesamiento fiscal y almacenamiento de artefactos cuando se resuelva su despliegue y costo. Admin SDK requiere autorización explícita en cada operación: no está limitado por Security Rules.

Colecciones activas:

- `registeredUsers/{uid}`: ficha de usuario; el acceso global depende de la claim privilegiada platformAdmin.
- `organizations/{nit}`: compañía y membresías.
- `companyAssignments/{email}`: reserva que limita al usuario normal a una compañía; se mantiene atómicamente con la membresía y auditoría.
- `organizations/{nit}/profiles/tax`: ficha de empresa.
- `organizations/{nit}/customers/{id}`: clientes.
- `organizations/{nit}/drafts/{id}`: documentos preliminares y control de reintentos/edición.
- `organizations/{nit}/audit/{id}`: historial de cambios.
- `organizations/{nit}/products/{code}`: catálogo publicado y habilitado en reglas reales.

Datos futuros a diseñar antes de implementarlos: pagos y sus aplicaciones, series/resoluciones, documentos fiscales inmutables, envíos, respuestas, eventos y referencias a artefactos. Estos nombres conceptuales no son colecciones ya creadas. Moneda explícita desde el modelo; multimoneda y tipos documentales adicionales son futuras ampliaciones a evaluar.

## Publicación y siguiente entrega

La migración Vue está aislada en la rama local `migration/vue3`. Landing, aplicación, mapa y caracterizaciones ya son renderizados por Vue en la compilación local, conservando las rutas y controles existentes. La usuaria pidió probarla antes de publicarla: no se desplegará en Firebase ni se enviará a GitHub hasta una aprobación posterior expresa.

Los cortes nativos ya reemplazaron landing/autenticación, índice del mapa, cabecera, menú del usuario, selector de compañía, Datos de empresa y Usuarios/permisos por componentes Vue. La persistencia auditada continúa temporalmente en servicios existentes para no alterar reglas ni formatos durante la transición.

El próximo corte centraliza identidad, compañía, rol y permisos en Pinia y crea la base común de módulos. Después se migran Clientes, Contactos y Sedes a Vue; siguen Cotizaciones, Compras, Inventario, Producción y Soporte conforme a [MODERNIZACION_SIGMYP.md](MODERNIZACION_SIGMYP.md).

La etapa 1 tiene una entrega parcial publicada y comprobada en emuladores: esquema histórico y condiciones de pago. La usuaria priorizó el motor de descuentos e impuestos; referencias/unidades de productos y separación de estados quedan pendientes. Pagos y aplicaciones siguen en la etapa 3. La usuaria reafirmó el 5 de octubre mantener DIAN al final. La entrega está publicada en https://sigmyp.web.app/ y dist-cloud actualizado para la vista local conectada a Firebase real. El puerto 5500 conserva el entorno de emuladores.

La entrega del catálogo incluyó reglas y Hosting compatibles y reconstrucción de dist-cloud. Para futuras entregas que cambien reglas, el comando publish actual solo publica Hosting y no basta. Conservar dist, dist-cloud y dist-release separados; no modificar datos reales ni activar servicios de pago como consecuencia implícita de actualizar este plan.

Toda entrega registra: alcance, pruebas pertinentes, resultado local, limitaciones y estado de publicación. Para cambios de esquema, definir compatibilidad y necesidad real de migración antes de tocar registros existentes.

## Referencias y pendientes de verificación

- [Conversación aportada por la usuaria](https://chatgpt.com/share/6abfce1a-6b38-83e8-9d88-172e3992ab99): guía de arquitectura incorporada; no reemplaza normativa oficial.
- [Nueva conversación aportada](https://chatgpt.com/share/6ac3d5e3-891c-83e8-92ff-e0f422f63a3f): revisada el 5 de octubre; su propuesta de adelantar DIAN no se adopta por decisión expresa de la usuaria.
- [DIAN: documentación técnica](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/).
- [Resolución DIAN 227 de 2025](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm).
- [Firebase: Security Rules](https://firebase.google.com/docs/rules/basics) y [emuladores](https://firebase.google.com/docs/emulator-suite/install_and_configure).

Las referencias fiscales del plan anterior requieren revisión de vigencia al abordar su implementación. Esta actualización es de planificación, no una revisión legal ni certificación de cumplimiento. Antes de emisión deben estar definidos volumen/capacidad, presupuesto, responsables de operación, revisión contable, certificado/custodia y parámetros oficiales de habilitación.
