import type { Service } from './types';

export const services: Service[] = [
  {
    icon: 'database',
    title: 'Data Engineering',
    problem: 'Datos dispersos, sin confianza ni gobernanza',
    solution: 'Pipelines ETL/ELT robustos y arquitectura Medallion',
    desc: 'Diseño y construyo arquitecturas Bronze → Silver → Gold que centralizan y limpian tus datos para que sean confiables, reutilizables y escalables.',
    tags: ['Azure Data Factory', 'AWS Glue', 'Databricks', 'PySpark', 'Delta Lake'],
  },
  {
    icon: 'megaphone',
    title: 'Automatización de Marketing Data',
    problem: 'Reportes manuales que consumen días de trabajo',
    solution: 'Datos de ads actualizados automáticamente cada hora',
    desc: 'Integro las APIs de Google Ads, Meta Ads, TikTok y GA4 en tu data warehouse. Tu equipo toma decisiones con datos de hoy, no de la semana pasada.',
    tags: ['Google Ads API', 'Meta API', 'GA4', 'TikTok API', 'Python'],
  },
  {
    icon: 'bar-chart-3',
    title: 'Dashboards & BI',
    problem: 'Excel interminable y sin visibilidad en tiempo real',
    solution: 'Dashboards conectados que cualquier área puede leer',
    desc: 'Construyo dashboards en Power BI y Tableau conectados a tus fuentes de datos. Diseñados para que el equipo directivo entienda el negocio de un vistazo.',
    tags: ['Power BI', 'Tableau', 'DAX', 'Semántica de datos'],
  },
  {
    icon: 'plug',
    title: 'Integraciones API',
    problem: 'Sistemas que no se hablan entre sí',
    solution: 'Flujos automatizados entre todas tus plataformas',
    desc: 'Desarrollo conectores e integraciones personalizadas con FastAPI, Lambda y Azure Functions para que tus herramientas compartan información sin trabajo manual.',
    tags: ['FastAPI', 'AWS Lambda', 'REST APIs', 'Webhooks', 'Azure Functions'],
  },
  {
    icon: 'building-2',
    title: 'Consultoría de Arquitectura Cloud',
    problem: 'Costos de nube elevados y deuda técnica acumulada',
    solution: 'Arquitectura optimizada, bien documentada y escalable',
    desc: 'Audito tu arquitectura actual, identifico cuellos de botella y rediseño el stack para que sea más eficiente y económico — sin tirar lo que ya funciona.',
    tags: ['Azure Synapse', 'Redshift', 'Snowflake', 'Cost optimization'],
  },
];
