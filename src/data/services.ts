import type { Service } from './types';

export const services: Service[] = [
  {
    icon: 'database',
    title: 'Data Engineering',
    summary: 'Pipelines ETL/ELT y arquitectura Medallion para datos confiables y escalables.',
    tags: ['Azure Data Factory', 'AWS Glue', 'Databricks', 'PySpark'],
  },
  {
    icon: 'megaphone',
    title: 'Automatización de Marketing Data',
    summary: 'Google Ads, Meta, TikTok y GA4 centralizados y actualizados solos.',
    tags: ['Google Ads API', 'Meta API', 'GA4', 'Python'],
  },
  {
    icon: 'bar-chart-3',
    title: 'Dashboards & BI',
    summary: 'Dashboards en Power BI y Tableau que se entienden de un vistazo.',
    tags: ['Power BI', 'Tableau', 'DAX'],
  },
  {
    icon: 'plug',
    title: 'Integraciones API',
    summary: 'Conecto tus plataformas con FastAPI, Lambda y Azure Functions.',
    tags: ['FastAPI', 'AWS Lambda', 'REST APIs', 'Webhooks'],
  },
  {
    icon: 'building-2',
    title: 'Consultoría de Arquitectura Cloud',
    summary: 'Audito y rediseño tu stack cloud: más eficiente y económico.',
    tags: ['Azure Synapse', 'Redshift', 'Snowflake'],
  },
];
