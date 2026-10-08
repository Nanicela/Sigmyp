// Mapeo de las filas 13–22 del Excel y las figuras de actividad de la columna H.
// Se normaliza la ortografía; no se añaden subpasos ni decisiones al flujo.
const activities = [
 ['Convocar a junta directiva','Partes interesadas','Revisión de estrategias o planes específicos','Comunicación de información relevante','Decisiones pactadas o información comunicada'],
 ['Detectar oportunidades de negocio','Clientes, colaboradores','Opiniones comerciales','Sugerencia de negocio o estrategia definida','Creación de una nueva necesidad de producto o servicio'],
 ['Identificación de mercado','Gerencias, asesores comerciales','Sugerencias de negocio','Análisis de mercado','Proyección estratégica de ventas'],
 ['Revisión de informe para gerencia','Gestión de Mejora Continua','Desempeño de indicadores de proceso, eficacia de acciones y seguimiento de PQRF','Informe para la gerencia validado','Análisis de la eficacia del SGC'],
 ['Revisión de plan estratégico','Gestión de Mejora Continua','Revisión por la gerencia','Evaluación, análisis y planes de acción','Prioridades y recomendaciones para mejorar el desempeño de la organización'],
 ['Revisión de análisis del contexto','Partes interesadas','Necesidades y expectativas actuales','Acciones de mejora, actualización de matriz DOFA y stakeholders','Contexto de la organización gestionado'],
 ['Identificación de riesgos','Todos los procesos','Necesidad de identificación de acciones preventivas','Matriz de riesgos actualizada','Gestión preventiva de los riesgos, responsabilidades y recursos para implementar las estrategias de mitigación'],
 ['Seguimiento de indicadores','Todos los procesos','Indicadores de procesos','Cuadro de mando de indicadores actualizado y acciones de mejora que impacten los procesos','Mejora y eficiencia en la producción y la calidad de los productos y servicios'],
 ['Ajuste de cambios','Gerencia','Revisión de la gerencia','Procesos e información actualizada','Efectividad de los cambios, que no causen problemas inesperados']
];
const resources = [
 ['Físicos','Puestos de trabajo (escritorios, sillas, archivadores). Equipo de oficina (papelería básica). Área de almacenamiento. Equipos de comunicación (teléfono), marcadores y pizarrones, salas de reunión.'],
 ['Logísticos','Procedimiento documentado de compras. Matriz de proveedores aprobados. Coordinación con todos los procesos.'],
 ['Financieros','Presupuesto para la planificación y la implementación de proyectos, fondos para la capacitación del personal, recursos para la adquisición de equipos y tecnología.'],
 ['Información y datos','Acceso a información y datos relevantes para la planificación. Bases de datos y sistemas de información. Herramientas de análisis y evaluación de datos.'],
 ['Humanos','Personal capacitado en planificación y gestión de proyectos.'],
 ['Tecnológicos','Software de planificación y gestión de proyectos, computadores, herramientas ofimáticas, sistema de control documental, proyectores y pantallas para presentaciones, correo electrónico y acceso a internet.']
];
