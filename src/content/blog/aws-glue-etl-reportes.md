---
title: "De 3 días a 15 minutos: cómo reconstruí el ETL de un e-commerce con AWS Glue"
description: "Caso real de cómo reemplazé un proceso manual de reportes con un pipeline automático en AWS Glue + PySpark + Redshift. Incluye arquitectura, código y lecciones aprendidas."
pubDate: 2025-01-15
tags: ["AWS Glue", "ETL", "PySpark", "Redshift", "Data Engineering"]
readingTime: 8
featured: true
---

Cuando llegué a este proyecto, el equipo de operaciones pasaba cada lunes descargando CSVs de cuatro plataformas distintas, copiando datos en Excel y enviando el reporte a dirección el martes o miércoles. **Tres días de trabajo manual. Cada semana.**

En este artículo te cuento cómo lo resolví con AWS Glue, PySpark y Redshift.

## El problema en detalle

La empresa tenía datos en:

- **Sistema de ventas** (PostgreSQL on-premise)
- **Inventario** (API REST de su ERP)
- **Logística** (archivos CSV que enviaba el proveedor por SFTP)
- **Pagos** (webhooks de Stripe guardados en S3)

Cada fuente tenía sus propios formatos, encodings y convenciones de nombres. El proceso manual introducía errores constantemente.

## La arquitectura que diseñé

```
[PostgreSQL] ──┐
[ERP API]   ──┤──► [S3 Raw Zone] ──► [AWS Glue ETL] ──► [Redshift] ──► [Power BI]
[SFTP CSV]  ──┤
[S3 Stripe] ──┘
       ↑
   [Step Functions orquesta todo]
```

### Por qué elegí AWS Glue sobre alternativas

Podría haber usado Airflow + custom scripts, pero para este cliente tenía tres ventajas claras:

1. **Serverless**: no hay servidores que administrar ni escalar
2. **Catálogo de datos integrado**: AWS Glue Data Catalog se convierte en el inventario de todo el data lake
3. **Conector nativo a Redshift**: sin escribir código de conexión

## El código que cambió todo

El Glue Job central hace la transformación más compleja: unificar los cuatro esquemas en uno solo.

```python
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql import functions as F
from pyspark.sql.types import *

args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc   = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job   = Job(glueContext)
job.init(args['JOB_NAME'], args)

# --- Leer fuentes ---
ventas = glueContext.create_dynamic_frame.from_catalog(
    database="ecommerce_raw",
    table_name="ventas_postgres"
).toDF()

pagos = spark.read.parquet("s3://mi-bucket/raw/stripe/")

# --- Normalizar fechas (cada fuente tenía formato diferente) ---
ventas = ventas.withColumn(
    "fecha",
    F.to_timestamp(F.col("created_at"), "yyyy-MM-dd HH:mm:ss")
)
pagos = pagos.withColumn(
    "fecha",
    F.to_timestamp(F.col("created"), "yyyy-MM-dd'T'HH:mm:ss'Z'")
)

# --- Join y enriquecimiento ---
resultado = ventas.join(
    pagos,
    ventas.order_id == pagos.metadata_order_id,
    "left"
).select(
    ventas.order_id,
    ventas.fecha,
    ventas.total.alias("monto_venta"),
    pagos.amount_received.alias("monto_cobrado"),
    F.when(
        ventas.total == (pagos.amount_received / 100), "OK"
    ).otherwise("DISCREPANCIA").alias("estado_pago")
)

# --- Escribir en Redshift ---
glueContext.write_dynamic_frame.from_jdbc_conf(
    frame=DynamicFrame.fromDF(resultado, glueContext, "resultado"),
    catalog_connection="redshift-prod",
    connection_options={"dbtable": "ventas.hechos_ventas", "database": "analytics"},
    redshift_tmp_dir="s3://mi-bucket/tmp/glue/"
)

job.commit()
```

## La orquestación con Step Functions

El pipeline completa en este orden:

1. **Extracción**: Lambda extrae datos del ERP API y los deposita en S3
2. **Transformación**: Glue Job procesa todos los datos
3. **Carga**: Escribe en Redshift y actualiza el Catálogo
4. **Notificación**: SNS envía email confirmando éxito (o alerta si falla)

El trigger es un EventBridge rule que corre a las **3:00 AM de lunes a viernes**.

## Resultados después de 3 meses

| Métrica | Antes | Después |
|---|---|---|
| Tiempo de reporte | 3 días | 15 minutos |
| Errores manuales | ~5 por semana | 0 |
| Costo infra mensual | $0 (trabajo humano) | $47 USD |
| Horas humanas/semana | 12 horas | 0 |

El costo de **$47 USD mensuales** vs. 12 horas/semana de un analista es probablemente el mejor ROI que he visto en un proyecto.

## Lecciones aprendidas

**1. Siempre valida en Bronze antes de transformar.** Guardar los datos crudos en S3 me salvó dos veces cuando hubo cambios de formato inesperados en las fuentes.

**2. El schema evolution es inevitable.** El ERP cambió un campo de `precio` a `price` en una actualización. Tener el Glue Data Catalog configurado correctamente detectó el cambio antes de que rompiera producción.

**3. Step Functions > Airflow para pipelines simples.** Si tienes menos de 20 pasos y todo está en AWS, Step Functions es más barato y no requiere mantener un servidor de Airflow.

---

¿Tienes un proceso similar en tu empresa? [Hablemos.](https://wa.me/529983253195?text=Hola%20Edgar%2C%20le%C3%AD%20tu%20art%C3%ADculo%20de%20AWS%20Glue%20y%20me%20interesa%20hablar)
