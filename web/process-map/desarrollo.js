// Datos del Excel CT-C-DL-001. Se preserva el orden de las actividades y sus relaciones.
const activities = [
  [
    "Identificación y clasificación: validación del requerimiento según su tipo: bug, solicitud de cliente o mejora interna",
    "Cliente / Área Comercial / Soporte /Interno",
    "Solicitud inicial de desarrollo, mejora o reporte de bug",
    "Solicitud formal categorizada y validada",
    "Requerimiento o fallo claramente identificado y canalizado."
  ],
  [
    "Aprobación y definición de alcance: definición de condiciones técnicas, costos y tiempos pactados",
    "Cliente / Área de desarrollo",
    "Requerimiento formal del cliente o iniciativa interna aprobada.",
    "Documento de alcance (FT-C-DS-001) o especificación técnica",
    "Requerimiento definido y viable para su ejecución"
  ],
  [
    "Registro en Asana por sección: alta de la tarea en el tablero asignado dentro de Asana: Bugs, Solicitudes de Clientes o Interno",
    "Área de desarrollo / Área Comercial / Soporte",
    "Alcance aprobado o incidente verificado",
    "Registro formal con campos obligatorios en Asana y responsable asignado.",
    "Inicio formal de la tarea con trazabilidad y asignación de carga"
  ],
  [
    "Ejecución técnica y Code Review: desarrollo, creación de PR en GitHub y revisión",
    "Área de desarrollo",
    "Tarea asignada en Asana y entorno preparado (PC-C-DL-002).",
    "Pull Request aprobado y merge realizado en la rama main",
    "Código fuente listo e integrado en la rama principal."
  ],
  [
    "Control de calidad (QA en Asana): transición de la tarea al estado QA para ejecutar la revisión profunda con el sistema integrado",
    "Área de desarrollo",
    "PR fusionado en main",
    "Entregables funcionales validados internamente",
    "Avance funcional del desarrollo listo para revisión"
  ],
  [
    "Despliegue en producción y cierre: publicación en ambiente productivo, actualización del estado a Entregado en Asana y notificación",
    "Área de desarrollo / Cliente",
    "Desarrollo verificado y aprobado en QA.",
    "Producto desplegado y notificado al cliente/usuario.",
    "Producto funcional en producción con trazabilidad completa"
  ],
  [
    "Control de salidas no conformes: tratamiento e investigación de causa raíz de reclamos de clientes en la matriz de registro",
    "Atención al Cliente",
    "Quejas de clientes sobre entregables o servicios (PC-C-DL-005).",
    "Matriz de Salidas No Conformes actualizada y acciones correctivas aplicadas.",
    "Resolución de disconformidades y mejora continua del servicio."
  ],
  [
    "Medición y mejora continua: evaluación de desempeño e indicadores de cumplimiento",
    "Mejora Continua",
    "Registros de tiempos en Asana e indicadores de entrega.",
    "Planes de acción y optimizaciones de flujo documentadas",
    "Desempeño optimizado del proceso de desarrollo."
  ]
];
const resources = [
  [
    "Físicos",
    "espacios de trabajo como oficina, equipos de cómputo, mobiliarios ergonómicos"
  ],
  [
    "Logísticos",
    "Infraestructura de red y conectividad, programación de reuniones"
  ],
  [
    "Humanos",
    "Equipo de desarrollo"
  ],
  [
    "Tecnológicos",
    "IDEs y entorno de desarrollo(Visual Studio), sistemas de control de versiones (GitHub),Asana, plataforma de integración y despliegues continuos, ambientes de desarrollo, pruebas y producción, plataformas de comunicación (Meet)"
  ]
];

// Títulos breves de navegación; la descripción completa permanece en el flujo.
const activityLabels = ["Identificación y clasificación", "Aprobación y definición de alcance", "Registro en Asana por sección", "Ejecución técnica y Code Review", "Control de calidad (QA en Asana)", "Despliegue en producción y cierre", "Control de salidas no conformes", "Medición y mejora continua"];
