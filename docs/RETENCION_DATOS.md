# Política de retención anual de datos

Actualizado: 13 de octubre de 2026.

## Decisión de producto

SIGMYP trabajará con el año calendario vigente como periodo operativo predeterminado. Las listas, tableros y consultas de transacciones mostrarán solamente el año vigente sin exigir un filtro manual. El cambio de año será automático según la zona horaria de Colombia; no se escribirá `2026` de forma fija en el código.

Esta regla se aplica a transacciones como cotizaciones, órdenes de compra, movimientos de inventario, órdenes de producción, remisiones, tickets cerrados, documentos, pagos e indicadores derivados.

## Datos que permanecen activos entre años

Los siguientes datos no se eliminan al terminar el año porque describen la configuración y las relaciones vigentes de una compañía:

- compañías y perfiles tributarios;
- usuarios, membresías, roles y permisos;
- clientes, contactos y sedes;
- proveedores y contactos;
- productos, servicios, ítems, procesos, recursos y activos;
- configuraciones, consecutivos y catálogos.

Estos registros se desactivan o versionan cuando dejan de utilizarse. No se vuelven a crear cada enero.

## Archivo histórico obligatorio

Mantener solo el año vigente en la base operativa no significa destruir la historia. Antes de retirar un periodo se debe generar un archivo histórico inmutable fuera de las colecciones operativas de Firestore, con:

- exportación completa por compañía y año;
- manifiesto de documentos, cantidades y totales;
- huella criptográfica para comprobar integridad;
- fecha, responsable y resultado de la exportación;
- copia de auditoría y relaciones necesarias para interpretar los registros;
- prueba de restauración y conciliación antes de retirar la información operativa.

Los documentos fiscales, contables y sus soportes se conservarán durante el plazo legal aplicable. El Código de Comercio exige conservar libros y papeles del comerciante por al menos diez años desde el último asiento, documento o comprobante. La regulación tributaria también exige conservar información y pruebas durante los términos aplicables. Por ello SIGMYP no ejecutará una eliminación anual irreversible de estos documentos.

Fuentes consultadas:

- [Código de Comercio, artículo 60 — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?1425=&i=41102)
- [DIAN, Oficio 18347 de 2018 — conservación tributaria y comercial](https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_18347_2018.htm)
- [DIAN, Resolución 167 de 2021 — conservación y consulta posterior](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0167_2021.htm)

## Cambio anual

El cierre seguirá este orden:

1. bloquear cambios del periodo que se va a cerrar;
2. conciliar cantidades, totales, existencias, saldos y auditoría;
3. exportar y comprobar el archivo histórico;
4. realizar una restauración de prueba;
5. registrar la aprobación de la persona responsable;
6. retirar de la base operativa únicamente los registros cubiertos por el archivo;
7. conservar un índice mínimo que permita localizar y recuperar el periodo.

No se eliminarán datos reales durante el desarrollo ni se automatizará el cierre hasta contar con almacenamiento de archivo, restauración probada, responsables y una política aprobada para cada tipo documental.
