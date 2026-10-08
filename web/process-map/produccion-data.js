// Caracterizaciones de Producción. Datos de los tres Excel suministrados.
const productionData = {
  "ensamble": {
    "name": "Ensamble",
    "code": "CT-C-PR-001",
    "version": "3",
    "date": "06/03/2026",
    "owner": "Líder y auxiliar de Ensamble",
    "objective": "Ensamblar, instalar, capacitar y brindar soporte de los productos de la empresa cumpliendo con los tiempos de entrega, las expectativas de calidad y buen uso de recursos.",
    "scope": "Este proceso inicia una vez el asesor comercial genera una OP; se verifica existencia de mercancía en almacén y fechas esperadas. Se dan los lineamientos paso a paso acorde a los Formatos de cada producto. Los cuales se ensamblan, configuran y prueban según el uso. Si todo se cumple conformidad, se da aviso al área de instalaciones para el adecuado empaque de los equipos, custodia y envío.",
    "schema": "standard",
    "docs": [
      {
        "title": "PC-C-PR-001 Procedimiento de Ensamble",
        "url": "https://docs.google.com/document/d/1qfuOknrJ2Sbp-GoV1iZWK4AosA2CivTg/edit",
        "kind": "Procedimiento",
        "note": ""
      },
      {
        "title": "Sigmyp",
        "url": null,
        "kind": "Formato / recurso",
        "note": "Recurso de la red interna de DyD."
      },
      {
        "title": "SERIALES DYD",
        "url": "https://docs.google.com/spreadsheets/d/16yeMzeLcXz-Kv4PLyMF345bHQYjjdfo_/edit?gid=412544025",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "Placas SURA",
        "url": "https://docs.google.com/spreadsheets/d/1mvDMBboBXGtdebLQQhYv-hN-hnvwtRBd5xV1Tl9D-VE/edit?gid=1186573401",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "Indicadores",
        "url": "https://docs.google.com/spreadsheets/d/1pGNlUWmh1cgIPJug2i05t3AoG_f8CKxP0guXbgNB834/edit?gid=0",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-002 Formato de capacitación.docx",
        "url": "https://docs.google.com/document/d/15zBmfABHfIPmIlIabgjNK-XTad7XFEvH/edit",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-003 Formato de instalación.docx",
        "url": "https://docs.google.com/document/d/1PLAyza1l1z2p5GGDJc0xm-Yi7GAbVzCe/edit",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-004 - DAT Metálico",
        "url": "https://docs.google.com/document/d/1s6ktgWnPRT2S1fD53WsiluT3mzfBnTugorC2U_qopIE/edit?tab=t.0",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-005 - Player",
        "url": "https://docs.google.com/document/d/1fompbDvFhfpkOrGjfORoWidsKy4VFYz-8NCy4Jl5ukw/edit?tab=t.0",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-006 - Combo Orientador",
        "url": "https://docs.google.com/document/d/19jYd6rmHb3QZzxiHFgIlmmXPb8-47wDbB37q2SN2eqM/edit?tab=t.0",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-007 Calificador Encuestador.pdf",
        "url": "https://drive.google.com/file/d/1zWnqTtYsOYqQmt8idytekSoRfCEdPxLf/view?usp=sharing",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-008 - Dinkiosko",
        "url": "https://docs.google.com/document/d/1paJbm2A7wUrvQYiullNhDRcTH0EX44P71JMJ-1lXKLs/edit?tab=t.0",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-009 Llamador Clinum.docx",
        "url": "https://docs.google.com/document/d/1Ycc1KSZS6rb1sJvhdT1EjbBb7PP8mxY-/edit",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-010 Gateway.docx",
        "url": "https://docs.google.com/document/d/1Ny9sXLP5TWt3JH-t3fwmwGEjlNO8gMEg/edit",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-011 Servidor TS.docx",
        "url": "https://docs.google.com/document/d/1Ez3or3762SPleuIcZhmh1LRIuWyKCuLc/edit",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-012 Lámpara Clinum.docx",
        "url": "https://docs.google.com/document/d/1V3OzrqS8re8vXqfNvbuHEBCHBKNkwoIT/edit",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-013 Repetidor.docx",
        "url": "https://docs.google.com/document/d/1mC5c8ZbUingbHPZDBujjOB9-O-ba7ohM/edit",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-014 Servidor Clinum.docx",
        "url": "https://docs.google.com/document/d/1lHVn6p1i6dNOOckPe5h3hbhxm2vxIVJz/edit",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "FT-C-PR-015 Turnero Digital.docx",
        "url": "https://docs.google.com/document/d/16IDsAkHtRbafxzHJTadf-tFNp_GyiQWA/edit?rtpof=true",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "Generar Remisión",
        "url": "https://drive.google.com/drive/folders/1Rbxooen0Sw47DTEsC-SwKKnKuS1bOTi9",
        "kind": "Formato / recurso",
        "note": ""
      },
      {
        "title": "Registros físicos y digitales del proyecto",
        "url": null,
        "kind": "Formato / recurso",
        "note": "El Excel remite a una cuenta de correo, no a un documento específico."
      },
      {
        "kind": "Registro / indicación",
        "title": "Avances del proyecto",
        "note": "Notificar a las áreas de interes sobre: retrasos o novedades presentadas"
      },
      {
        "kind": "Registro / indicación",
        "title": "Preservación de equipos",
        "note": "Empaque según el destino, su custodia equipos ahora del cliente y envíos con el vehiculo empresarial locales o bajo GUIA Coordinadora"
      },
      {
        "kind": "Referencia",
        "title": "AYUDAS, MANUALES, Sitios web oficiales",
        "note": "Sin enlace específico en el Excel."
      }
    ],
    "risks": [],
    "resources": [
      [
        "Físicos",
        "Taller DyD, herramientas y equipos de computo: impresora, destornilladores múltiples, llaves, motortool, entre otros Consumos requeridos para la actividad de ensamble: bridas, botones adhesivos, multitomas. Componentes para ensamble Ej. Monitor Touch, MiniPC NUC, Impresora térmica, Lector de documentos y otros periféricos"
      ],
      [
        "Logísticos",
        "Manipulación prudente de equipos para su embalaje y presevación en almacén para su posterior transporte local o con proveedor externo; previamente autorizados para su liberación"
      ],
      [
        "Humanos",
        "Líder ensamble, instalaciones y soporte, compras, análistas, auxiliares y técnicos de soporte (Personal DyD según su competencia) con su debido Equipo de seguridad industrial (EPP)"
      ],
      [
        "Tecnológicos",
        "Equipos/Hardware Software/Sistemas Tecnologías de la información y la comunicación (TIC) utilizadas en la fase de Registro y Programación: Formatos Recursos de seguimiento, control y medición adecuados: Manuales para prueba y verificación de funcionamiento"
      ]
    ],
    "indicators": [
      {
        "name": "Cumplimiento de entregas",
        "formula": "(Cantidad de OP concluidas /Cantidad de OP planificadas) × 100",
        "frequency": "Mensual",
        "goal": "98 %"
      },
      {
        "name": "% de ocupación de las personas",
        "formula": "(Tiempo real de ensamble / Tiempo estándar planificado) × 100 1hora/Player, 2horas/DAT",
        "frequency": "Mensual",
        "goal": "75 %"
      },
      {
        "name": "Inventario",
        "formula": "Cantidad elementos requeridos según las OP creadas",
        "frequency": "Mensual",
        "goal": "60"
      },
      {
        "name": "Uso de la vans",
        "formula": "Promedio Cantidad Desplazamientos y Cantidad Vueltas",
        "frequency": "Mensual",
        "goal": "3"
      }
    ],
    "changes": [
      {
        "version": "1",
        "description": "Creación / Elaboración",
        "reviewer": "Jhon Jairo Montoya Gallo",
        "approver": "Julian cardona",
        "date": "25/09/2024"
      },
      {
        "version": "2",
        "description": "Se complementa información y se adapta al nuevo diseño del formato",
        "reviewer": "Jhon Jairo Montoya Gallo",
        "approver": "Julian cardona",
        "date": "30/10/2025"
      },
      {
        "version": "3",
        "description": "Se actualizan los Indicadores",
        "reviewer": "Jhon Jairo Montoya Gallo",
        "approver": "Julian cardona",
        "date": "06/03/2026"
      }
    ],
    "download": "caracterizacion-produccion-ensamble.xlsx",
    "activities": [
      {
        "title": "Recepción de OP y verificación de formatos",
        "provider": "Área comercial",
        "entry": "Orden de producción (OP), solicitud desde el área comercial, soporte y/o instalaciones",
        "output": "Verificación de Formatos existentes y comunicación con almacén (Compras) sobre componentes requeridos",
        "result": "Formatos con checkist según OP",
        "decision": false,
        "note": "Título descriptivo de la fila inicial: el Excel no asigna un nombre de actividad a esta fila."
      },
      {
        "title": "¿Requiere ensamble?",
        "provider": "Líder ensamble",
        "entry": "Formatos con checkist según OP",
        "output": "Solicitud de componentes en Almacén",
        "result": "Ítems por verificar (carcasas y equipos electrónicos)",
        "decision": true
      },
      {
        "title": "Ensamble de productos",
        "provider": "Compras / Almacén",
        "entry": "Componentes",
        "output": "Fijación de componentes en gabinete metálico o según la necesidad",
        "result": "Producto ensamblado: listo para programar y configurar",
        "decision": false
      },
      {
        "title": "Configurar según especificaciones",
        "provider": "Líder ó auxiliar ensamble",
        "entry": "Producto ensamblado / Equipo(s) a usar",
        "output": "Programación, configuración básica y revisión según checklist del Producto",
        "result": "Producto funcional y configurado",
        "decision": false
      },
      {
        "title": "¿Funciona correctamente?",
        "provider": "Líder ó auxiliar ensamble",
        "entry": "Pruebas físicas: Verificación de lo realizado",
        "output": "Registro de ítems en formatos",
        "result": "Formatos diligenciados y producto(s) funcional(es)",
        "decision": true
      },
      {
        "title": "Empaque de productos",
        "provider": "Líder ó auxiliar ensamble",
        "entry": "Producto terminado",
        "output": "Empaque según destino y custodia de equipos para su envío",
        "result": "Producto protegido y marcado para entrega según indicaciones",
        "decision": false
      }
    ],
    "requirements": "ISO 9001:2015 7.1.3 - 7.1.5.1 - 7.1.5.2 - 8.1 - 8.5.1 - 8.5.2 - 8.5.3 - 8.5.4 - 8.5.5 - 8.5.6 - 8.6 - 8.7.1 - 8.7.2",
    "prepared": "Proceso Mejora Continua",
    "reviewer": "Julian Cardona",
    "reviewDate": "30/10/2025",
    "notes": [
      "El campo de riesgos no está diligenciado en el Excel.",
      "Se conserva el título descriptivo de la primera fila y las preguntas de decisión del diagrama."
    ]
  },
  "instalaciones": {
    "name": "Instalaciones",
    "code": "CT-C-PR-001",
    "version": "2",
    "date": "06/10/2025",
    "owner": "Líder de instalaciones",
    "objective": "Acoplar, instalar, capacitar y brindar soporte de los productos de la empresa cumpliendo con los tiempos de entrega y las expectativas de calidad y buen uso de recursos.",
    "scope": "Este proceso inicia en paralelo una vez el asesor comercial genera una OP; posteriormente retoma cuando ensamble realiza el envío de la mercancía y finaliza cuando el personal de la sede es capacitado para el adecuado uso de los equipos y software.",
    "schema": "standard",
    "docs": [
      {
        "title": "PC-C-PR-004 Procedimiento Instalaciones",
        "url": "https://docs.google.com/document/d/1xC6w-aAT6drN_esr5E8a8n_4m6UhKW5C/edit?rtpof=true&tab=t.0",
        "kind": "Procedimiento",
        "note": ""
      },
      {
        "title": "FT-C-PR-002 Formato de capacitación",
        "url": "https://docs.google.com/document/d/15zBmfABHfIPmIlIabgjNK-XTad7XFEvH/edit",
        "kind": "Formato",
        "note": ""
      },
      {
        "title": "FT-C-PR-003 Formato de instalación",
        "url": "https://docs.google.com/document/d/1PLAyza1l1z2p5GGDJc0xm-Yi7GAbVzCe/edit",
        "kind": "Formato",
        "note": ""
      },
      {
        "title": "Indicadores instalaciones",
        "url": "https://docs.google.com/spreadsheets/d/1LyBCClrik_lsSK9jIU1u8GXBKXvYGKwqMTBgJoVjG4U/edit?gid=978505302",
        "kind": "Formato",
        "note": ""
      }
    ],
    "risks": [
      "Riesgo de quejas e inconformidad del cliente a causa de retrasos en la instalación cuya fuente es falta de coordinación logística, disponibilidad de personal técnico o de equipos",
      "Riesgo de pérdida de clientes, inconformidad del cliente y sanciones a causa de fallas técnicas en hardware o software cuya fuente es equipos defectuosos de fábrica o desarrollos de software incompletos",
      "Riesgo de insatisfacción o uso inapropiado del producto desaprovechando sus caracteristicas a causa de capacitaciones incompletas o inefectivas cuya fuente es personal técnico sin conocimiento necesario para capacitar al cliente",
      "Riesgo de lesiones, incumplimiento de normas de seguridad, paralización de la instalación a causa de accidentes laborales en sitio del cliente cuya fuente es espacios reducidos, obstáculos, riesgos eléctricos, falta de EPP",
      "Riesgo de costos adicionales, retrasos en la entrega y pérdida de garantía a causa de daños o accidentes durante el transporte o instalación cuya fuente es embalaje inadecuado, mala manipulación durante el transporte o durante la instalación",
      "Riesgo de demoras, reprogramación de visitas y cambios en la programación de actividades a causa de interrupción por condiciones externas cuya fuente es falta de disponibilidad del cliente"
    ],
    "resources": [
      [
        "Personal",
        "Técnico de instalaciones"
      ],
      [
        "Herramientas",
        "Herramientas de instalación (taladro, destornilladores, tester, etc.)."
      ],
      [
        "Seguridad",
        "Equipo de seguridad industrial (EPP)."
      ],
      [
        "Registro y gestión",
        "Plataformas de registro y gestión de servicios keepler."
      ]
    ],
    "indicators": [
      {
        "name": "Cumplimiento de instalación",
        "formula": "Cantidad de instalaciones programadas Vs Cantidad de instalaciones finalizadas",
        "frequency": "Semestral",
        "goal": "95% de cumplimiento anual"
      },
      {
        "name": "Motivos de incumplimiento",
        "formula": "Conteo simple",
        "frequency": "Semestral",
        "goal": "5% motivos al año sean a causa de DYD"
      }
    ],
    "changes": [
      {
        "version": "2",
        "description": "Creación nuevo formato",
        "reviewer": "Lider de Instalaciones",
        "approver": "Julian Cardona",
        "date": "06/10/2025"
      }
    ],
    "download": "caracterizacion-produccion-instalaciones.xlsx",
    "activities": [
      {
        "title": "Establecer contacto con el cliente",
        "provider": "Área comercial",
        "entry": "Orden de producción, solicitud desde el área comercial",
        "output": "Comunicación con el cliente",
        "result": "Socialización sobre el proceso de instalaciones, actividades a realizar y solución de dudas"
      },
      {
        "title": "Solicitud de preinstalaciones",
        "provider": "Líder de instalaciones",
        "entry": "Se realiza solicitud de información sobre el uso de la plataforma",
        "output": "Con la información recibida se realiza una configuración inicial de los dispositivos y de la plataforma",
        "result": "Se tiene configurada una versión inicial de la plataforma para su uso"
      },
      {
        "title": "Programación de instalación",
        "provider": "Líder de instalaciones",
        "entry": "Comunicación con el cliente para revisar las fechas mas adecuadas para iniciar con la instalación",
        "output": "Se establece una fecha aproximada para realizar la instalación y capacitación sobre el uso de la plataforma",
        "result": "Fecha pactada"
      },
      {
        "title": "Instalación",
        "provider": "Líder de instalaciones, técnicos de soporte",
        "entry": "Instalación física de equipos en la sede del cliente",
        "output": "Se da por finalizada la instalación de los dispositivos y capacitación del personal",
        "result": "Producto instalado y aprobado por el cliente"
      },
      {
        "title": "Registro documental y actualización de indicadores",
        "provider": "Líder de instalaciones, técnicos de soporte",
        "entry": "Documentos de instalación, capacitación, remisión y visita en keepler",
        "output": "Se dejan todos los documentos diligenciados y firmados por el cliente, se envía correo de confirmación sobre la finalización de instalación y se actualiza la documentación de indicadores",
        "result": "Documentos diligenciados que soportan la finalización y entrega del producto"
      },
      {
        "title": "Acompañamiento",
        "provider": "Líder de instalaciones, técnicos de soporte",
        "entry": "Recomendaciones del cliente, dudas, ajustes",
        "output": "Se realizan ajustes adicionales que se requieran",
        "result": "Se da por finalizado el acompañamiento del área"
      }
    ],
    "requirements": "ISO 9001:2015 7.1.3 - 7.1.5.1 - 7.1.5.2 - 8.1 - 8.5.1 - 8.5.2 - 8.5.3 - 8.5.4 - 8.5.5 - 8.5.6 - 8.6 - 8.7.1 - 8.7.2",
    "prepared": "Proceso Mejora Continua",
    "reviewer": "Julian Cardona",
    "reviewDate": "06/10/2025",
    "notes": []
  },
  "soporte": {
    "name": "Soporte técnico",
    "code": "CT-C-PR-001",
    "version": "2",
    "date": "10/10/ 2025",
    "owner": "Líder de soporte",
    "objective": "Proporcionar soporte técnico oportuno y capacitar a los clientes en los sistemas de turnos que tiene desarrollados DyD, a través de las diferentes plataformas y canales de comunicación que tenemos establecidos, teniendo en cuenta sus necesidades y garantizando la satisfacción de los mismos. Adicionalmente, proyectar cronogramas de mantenimientos preventivos, con el fin de garantizar que los equipos funcionen en óptimas condiciones.",
    "scope": "No especificado en el Excel.",
    "schema": "support",
    "docs": [
      {
        "title": "PC-C-PR-002 - PROCEDIMIENTO SOPORTE TÉCNICO REMOTO",
        "url": null,
        "kind": "Procedimiento",
        "note": ""
      },
      {
        "title": "PC-C-PR-003 - PROCEDIMIENTO SOPORTE TÉCNICO EN SITIO",
        "url": null,
        "kind": "Procedimiento",
        "note": ""
      },
      {
        "title": "AT-C-PR-001 - Acta de visita técnica",
        "url": null,
        "kind": "Formato",
        "note": ""
      },
      {
        "title": "AT-C-PR-002 - Orden de soporte y diagnóstico",
        "url": null,
        "kind": "Formato",
        "note": ""
      },
      {
        "title": "F-016 - Mantenimiento DAT",
        "url": null,
        "kind": "Formato",
        "note": ""
      },
      {
        "title": "F-017 - Mantenimiento CLINUM",
        "url": null,
        "kind": "Formato",
        "note": ""
      }
    ],
    "risks": [],
    "resources": [],
    "indicators": [
      {
        "name": "Indicador de mantenimiento preventivo",
        "formula": "Mantenimientos realizados sistema de turnos / Mantenimientos programados",
        "frequency": "Mensual",
        "goal": "100 %"
      },
      {
        "name": "Incidentes con cambios de hardware",
        "formula": "Conteo simple",
        "frequency": "Mensual",
        "goal": "30"
      },
      {
        "name": "Cumplimiento de ANS interno",
        "formula": "Incidentes resueltos antes de 48 horas / Cantidad de incidentes",
        "frequency": "Mensual",
        "goal": "100 %"
      },
      {
        "name": "Cantidad de incidentes",
        "formula": "Conteo simple",
        "frequency": "Mensual",
        "goal": "300"
      }
    ],
    "changes": [
      {
        "version": "2",
        "description": "creación del nuevo formato",
        "reviewer": "Llider de Soporte",
        "approver": "Julian Cardona",
        "date": "10/10/2025"
      }
    ],
    "download": "caracterizacion-produccion-soporte.xlsx",
    "activities": [
      {
        "title": "Gestión de requerimientos de soporte técnico",
        "entry": "Requerimiento y/o solicitud de soporte técnico de clientes internos, o externos",
        "result": "Validación del registro del caso en plataformas y canales de comunicación",
        "decision": false,
        "note": ""
      },
      {
        "title": "¿Tiene contrato de soporte?",
        "entry": "Requerimiento y/o solicitud de soporte técnico de clientes internos, o externos",
        "result": "Verificación vigencia de contrato de soporte actualizado",
        "decision": true,
        "note": ""
      },
      {
        "title": "Remitir con el asesor comercial",
        "entry": "Requerimiento y/o solicitud de soporte técnico de clientes internos, o externos",
        "result": "No especificado en el Excel.",
        "decision": false,
        "note": "El diagrama muestra esta remisión en la ruta «No» de la validación de contrato. No define un resultado independiente."
      },
      {
        "title": "Gestión del requerimiento remoto o en sitio",
        "entry": "Análisis del alcance (criticidad) de la solicitud que reportó el cliente",
        "result": "Verificación disponibilidad de personal técnico",
        "decision": false,
        "note": ""
      },
      {
        "title": "Programar visita técnica en sitio",
        "entry": "Necesidad de visita presencial",
        "result": "Visita técnica ejecutada",
        "decision": false,
        "note": ""
      },
      {
        "title": "¿Se solucionó el incidente o requerimiento?",
        "entry": "Ajustes y configuraciones realizadas",
        "result": "Prestación del servicio, solución al soporte técnico",
        "decision": true,
        "note": ""
      },
      {
        "title": "Registrar el cierre del incidente y la solución del caso",
        "entry": "Ajustes y configuraciones realizadas",
        "result": "Prestación del servicio, solución al soporte técnico",
        "decision": false,
        "note": "Esta información está en las celdas combinadas B21:F24 y H21:M24, compartidas con la validación de solución."
      },
      {
        "title": "Solicitar equipos al área de Gestión de Compras",
        "entry": "Informe con el diagnóstico de fallas",
        "result": "Reposición de equipos al cliente",
        "decision": false,
        "note": "El diagrama incluye esta solicitud en la ruta «No» de la validación de solución."
      }
    ],
    "requirements": "ISO 9001:2015 7.1.3 - 7.1.5.1 - 7.1.5.2 - 8.1 - 8.5.1 - 8.5.2 - 8.5.3 - 8.5.4 - 8.5.5 - 8.5.6 - 8.6 - 8.7.1 - 8.7.2",
    "prepared": "Janet Quintero",
    "reviewer": "Julian Cardona",
    "reviewDate": "10/10/2025",
    "notes": []
  }
};
