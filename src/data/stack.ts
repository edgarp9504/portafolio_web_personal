import type { StackGroup } from './types';

export const stackGroups: StackGroup[] = [
  {
    label: 'Lenguajes & Procesamiento',
    items: ['Python', 'PySpark', 'SQL', 'FastAPI', 'Scala (básico)'],
  },
  {
    label: 'Cloud · Azure',
    items: ['Azure Data Factory', 'Azure Databricks', 'Azure Synapse', 'Azure Data Lake Gen2', 'Azure Functions'],
  },
  {
    label: 'Cloud · AWS',
    items: ['AWS Glue', 'Amazon S3', 'Amazon Redshift', 'AWS Lambda', 'RDS'],
  },
  {
    label: 'Plataformas de Datos',
    items: ['Databricks', 'Snowflake', 'Delta Lake', 'PostgreSQL', 'dbt'],
  },
  {
    label: 'IA & Machine Learning',
    items: ['OpenAI API', 'LangChain', 'MLflow', 'pgvector'],
  },
  {
    label: 'BI & Visualización',
    items: ['Power BI', 'Tableau', 'DAX'],
  },
  {
    label: 'APIs de Marketing',
    items: ['Google Ads API', 'Meta Ads API', 'TikTok API', 'GA4 API'],
  },
];
