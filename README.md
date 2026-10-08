# Sigmyp

**Sistema Integrado de Gestión para Micro y Pequeñas Empresas.**

> Estado actualizado al 2 de octubre de 2026: consulta el [plan vigente](docs/PLAN.md) y las [evidencias](docs/VALIDACION.md). Varias secciones históricas de este README describen el primer prototipo (Google, espacios privados y borradores inmutables) y no reflejan la aplicación actual: ya existen correo/contraseña, roles por compañía y edición controlada. El puerto local conectado a Firebase real es 5504. El catálogo se publicó el 2 de octubre junto con sus reglas; dist-cloud también está actualizado.

Primer avance de desarrollo para una empresa que busca habilitarse como proveedora tecnológica ante la DIAN de Colombia. Decisión de la usuaria: **Firebase**. Alcance inicial: factura electrónica y notas crédito/débito; se asumen diez empresas clientes, pendiente confirmar volumen mensual.

## Modo gratuito Spark

La aplicación web está configurada para `facturacion-electronica-a73e3`, con Authentication (Google) y Firestore Standard en `us-central1`. Se mantiene Spark, sin activar facturación. La dirección principal es https://sigmyp.web.app y sus datos se envían al proyecto real cuando se inicia sesión.

- Cada usuario tiene un espacio privado con sus empresas y borradores; todavía no comparte acceso con empleados o clientes.
- Facturas y notas crédito/débito preliminares, hasta **tres conceptos** por documento, IVA de 5 % o 19 %.
- El navegador calcula con enteros escalados y las reglas de Firestore verifican los importes en el servidor antes de aceptar cada escritura.
- Transacciones con identificadores de solicitud para evitar duplicados por reintentos; borradores inmutables.
- Las notas deben referenciar una factura del mismo espacio y empresa, con el mismo comprador.

Las Cloud Functions siguen disponibles en el modo emulador. No están desplegadas en el proyecto Spark. App Check no está configurado todavía.

**Son borradores sin validez fiscal.** No hay generación UBL, firma digital, CUFE/CUDE, numeración fiscal, comunicación DIAN, entrega de facturas, PDF fiscal o habilitación. No se han implementado notas sobre facturas emitidas, conciliación de saldos, impuestos completos, edición de borradores ni gestión de usuarios desde la interfaz. El historial consulta páginas de 25 borradores. El selector de referencias para notas mantiene los últimos cien documentos, independiente de los filtros del historial. Las notas de este avance preparan datos; no afectan saldos.

## Aplicación publicada

Abre https://sigmyp.web.app e inicia sesión con Google o contraseña. No necesita el servidor local. La sesión de localhost no se transfiere al dominio publicado; entra una vez en la dirección pública.

Para publicar actualizaciones: `bash scripts/local.sh publish` (solo Hosting).

## Abrir conectado a Firebase real

Con el puerto 5500 libre, ejecuta:

```bash
bash scripts/local.sh cloud
```

Abre http://localhost:5500 y usa **Continuar con Google**. `localhost` está autorizado en Authentication. La sesión se conserva mediante la persistencia local de Firebase hasta pulsar Cerrar sesión o borrar los datos del sitio. Usa el mismo navegador y dirección; las sesiones no se comparten entre Chrome y el navegador integrado. Los datos antiguos del emulador no se migran automáticamente a la nube. La sesión Google y el primer guardado deben verificarse en la aplicación.

## Abrir en este equipo

Desde esta carpeta:

```bash
bash scripts/local.sh start
```

En otra terminal:

```bash
bash scripts/local.sh seed
```

Abre http://127.0.0.1:5500 y entra con el usuario **ficticio de emulador** `demo@example.test`, contraseña `DemoFirebase123!`. Registra una empresa de ejemplo y guarda un borrador. Los datos de emuladores son temporales y se pierden al detenerlos; no uses información real en esta demostración.

El proyecto `demo-facturacion` es un identificador local, **no es un proyecto real creado en Firebase**. El script usa las herramientas descargadas en `work/runtime` de este espacio de trabajo; si el código se traslada a otro equipo, instala Node.js 22 y Java 21 y sigue la sección siguiente.

## Instalar en otro equipo

Requisitos: Node.js 22 con npm y Java 21.

```bash
npm ci
npm --prefix functions ci
npm test
npm run test:firebase
npm run emulators
# En otra terminal:
npm run seed:emulator
```

No ejecutes las pruebas contra un proyecto real: usan exclusivamente el prefijo `demo-` y verifican las direcciones de los emuladores.

## Configuración real

- Proyecto: `facturacion-electronica-a73e3`; alias CLI `desarrollo`.
- Authentication: proveedor Google habilitado.
- Firestore `(default)`: Standard, `us-central1`.
- Reglas publicadas el 28 de septiembre de 2026: acceso privado por UID y validación de importes.
- Configuración pública local: `web/firebase-config.json` (ignorada por Git), con `mode: "spark"` y `useEmulators: false`.
- El alias predeterminado de CLI continúa siendo `demo-facturacion` para evitar pruebas sobre datos reales.
- Firebase Hosting publicado el 29 de septiembre de 2026: https://facturacion-electronica-a73e3.web.app. No se desplegaron Cloud Functions.

La configuración web de Firebase es pública por diseño; **no colocar claves privadas de cuentas de servicio ni certificados de firma en ella**. Las funciones usan identidad administrada. La integración futura de firma usará un mecanismo de secretos del servidor con controles de acceso; nunca se enviarán claves privadas al navegador.

## Estructura

| Carpeta / archivo | Propósito |
|---|---|
| `web/` | Interfaz en español con SDK web de Firebase |
| `functions/domain.cjs` | Validación comercial y cálculo preliminar |
| `functions/index.cjs` | Funciones invocables autenticadas y operaciones transaccionales |
| `firestore.rules` | Autorización por usuario y validación de escrituras Spark |
| `storage.rules` | Acceso cerrado hasta implementar archivos fiscales |
| `tests/` | Pruebas de importes, acceso, transacciones y referencias |
| `docs/PLAN.md` | Arquitectura objetivo, etapas y criterios de aceptación |

Consulta el [plan de desarrollo](docs/PLAN.md) y el [registro de pruebas](docs/VALIDACION.md).

## Empresas y clientes — 30 de septiembre de 2026

Selecciona una empresa y abre Datos de la empresa activa para completar su ficha. El Directorio de clientes permite registrar y editar clientes privados de esa empresa; el selector Cliente registrado copia nombre e identificación al nuevo borrador. Las notas conservan el comprador de la factura referenciada.

Se admiten NIT, CC y CE numéricos (5–15 dígitos), DV obligatorio para NIT, razón social/nombre, correo, teléfono opcional, dirección en Colombia, departamento, municipio, condición frente al IVA y responsabilidades transcritas del RUT. La verificación del DV, catálogos oficiales y validación DIAN quedan pendientes. Estas fichas aún no se incorporan como datos fiscales completos al borrador; sus datos de comprador siguen siendo nombre e identificación. Los borradores previos permanecen inmutables.

La identidad de cada ficha no se edita. Los registros duplicados se rechazan y la edición detecta cambios concurrentes. Los datos se guardan bajo la empresa en profiles/tax y customers; las reglas validan el esquema y acceso por UID. No hay eliminación desde la interfaz.

## Acceso y navegación

La bienvenida y el inicio de sesión están en `/`; el espacio autenticado está en `/app.html`. El panel espera a restaurar la sesión antes de mostrarse y vuelve al acceso si no hay usuario. Cerrar sesión devuelve a la bienvenida. El botón superior del menú permite minimizarlo a iconos y expandirlo; la preferencia se conserva por navegador mediante localStorage.

## Consulta de documentos

Documentos guardados permite combinar Desde/Hasta, tipo e identificación exacta del comprador. Las fechas corresponden a createdAt (creación del borrador), se interpretan en hora de Colombia y Hasta incluye el día completo. La consulta se ejecuta en Firestore; Cargar más documentos obtiene páginas adicionales de 25. Limpiar restablece los filtros. El detalle muestra fecha, identificación, conceptos, impuestos, totales y referencia/motivo en notas. El contador indica documentos mostrados, no un total global.

## Vista del documento

En Documentos guardados, Ver documento abre una hoja visual con nombre/NIT de la empresa seleccionada, comprador del borrador, fecha en Colombia, conceptos y totales almacenados. Notas muestran motivo y referencia. La vista conserva la indicación de borrador sin validez fiscal y no agrega numeración, CUFE ni QR ficticios. No genera PDF fiscal. Cierra con el botón o Escape.


## Flujo local vigente con Firebase real

Ejecutar `bash scripts/local.sh cloud` (o sin argumentos) y abrir http://localhost:5504/. La interfaz se compila en dist-cloud y usa el proyecto real: acceder con Google y la cuenta habitual. Los datos y permisos modificados aquí tienen efecto real. Por preferencia vigente de la propietaria, cada cambio terminado se publica en Firebase después de validarlo. Las reglas e índices se despliegan cuando el cambio los requiere.

`bash scripts/local.sh roles` conserva la alternativa de emuladores en el puerto 5500, exclusivamente para pruebas. No usar sus cuentas ficticias en la conexión real.
