---
title: "Arquitectura Medallion en Azure Databricks: guía práctica con Delta Lake"
description: "Implementación paso a paso de la arquitectura Bronze, Silver y Gold en Azure Databricks con Delta Lake. Desde la ingesta cruda hasta la capa analítica lista para Power BI."
pubDate: 2025-02-03
tags: ["Azure", "Databricks", "Delta Lake", "Arquitectura Medallion", "Data Engineering"]
readingTime: 10
featured: true
---

La arquitectura Medallion resuelve uno de los problemas más comunes que veo en empresas con datos: **nadie sabe cuál es la "versión correcta" de los datos**.

¿El número de ventas del mes pasado que tiene el equipo de marketing coincide con el que tiene finanzas? Probablemente no. Eso es un problema de arquitectura, no de personas.

En este artículo implemento la arquitectura Medallion completa sobre Azure Databricks con Delta Lake.

## Qué es la arquitectura Medallion

La Medallion Architecture (popularizada por Databricks) divide los datos en tres capas:

- **Bronze**: datos crudos, tal cual llegan de la fuente. Nunca se modifican.
- **Silver**: datos limpios, validados y con esquema estable.
- **Gold**: datos agregados, listos para consumo analítico (Power BI, dashboards, ML).

```
Fuentes → [Bronze] → [Silver] → [Gold] → Consumidores
```

La clave: cada capa es **append-only** hasta Silver. Gold puede recalcularse.

## Setup inicial en Azure

### Recursos necesarios

```
Azure Subscription
├── Resource Group: rg-datalake-prod
│   ├── Azure Data Lake Storage Gen2 (ADLS)
│   │   ├── Container: bronze
│   │   ├── Container: silver
│   │   └── Container: gold
│   ├── Azure Databricks Workspace
│   └── Azure Data Factory (orquestación)
```

### Montar ADLS en Databricks

```python
# En un notebook de Databricks
configs = {
  "fs.azure.account.auth.type": "OAuth",
  "fs.azure.account.oauth.provider.type":
    "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider",
  "fs.azure.account.oauth2.client.id":     dbutils.secrets.get("kv-scope", "client-id"),
  "fs.azure.account.oauth2.client.secret": dbutils.secrets.get("kv-scope", "client-secret"),
  "fs.azure.account.oauth2.client.endpoint":
    f"https://login.microsoftonline.com/{dbutils.secrets.get('kv-scope', 'tenant-id')}/oauth2/token",
}

for zone in ["bronze", "silver", "gold"]:
    dbutils.fs.mount(
        source=f"abfss://{zone}@midatalake.dfs.core.windows.net/",
        mount_point=f"/mnt/{zone}",
        extra_configs=configs
    )
```

## Capa Bronze: ingesta sin transformar

El principio fundamental: **graba todo, transforma después**.

```python
from pyspark.sql import functions as F
from delta.tables import DeltaTable
from datetime import datetime

def ingest_to_bronze(source_df, entity_name: str):
    """
    Ingesta datos crudos al bronze con metadata de auditoría.
    No transforma nada — solo agrega columnas de control.
    """
    bronze_df = source_df.withColumns({
        "_ingestion_timestamp": F.current_timestamp(),
        "_source_system":       F.lit("erp_api"),
        "_ingestion_date":      F.current_date(),
        "_batch_id":            F.lit(datetime.now().strftime("%Y%m%d_%H%M%S")),
    })

    (
        bronze_df.write
        .format("delta")
        .mode("append")                              # siempre append, nunca overwrite
        .option("mergeSchema", "true")               # acepta nuevas columnas del source
        .partitionBy("_ingestion_date")
        .save(f"/mnt/bronze/{entity_name}")
    )
    print(f"✅ Bronze: {bronze_df.count()} registros → {entity_name}")
```

> **Punto clave**: el `mergeSchema = true` permite que si la fuente agrega una columna nueva, Bronze la capture automáticamente sin fallar. Silver decide si propagarla o ignorarla.

## Capa Silver: limpieza y validación

Silver es donde aplicamos las reglas de negocio, eliminamos duplicados y estandarizamos.

```python
from pyspark.sql.functions import *
from pyspark.sql.types import *

def transform_orders_to_silver():
    """
    Transforma la tabla de órdenes de Bronze a Silver.
    Aplica: deduplicación, casting, validaciones y estandarización.
    """
    bronze_df = spark.read.format("delta").load("/mnt/bronze/orders")

    silver_df = (
        bronze_df
        # 1. Deduplicar por clave de negocio, quedarse con el más reciente
        .withColumn("_rank", row_number().over(
            Window.partitionBy("order_id")
                  .orderBy(desc("_ingestion_timestamp"))
        ))
        .filter(col("_rank") == 1)
        .drop("_rank")

        # 2. Castear y limpiar tipos
        .withColumn("order_date",  to_date(col("order_date"), "yyyy-MM-dd"))
        .withColumn("total_amount", col("total_amount").cast(DecimalType(18, 2)))
        .withColumn("customer_id", col("customer_id").cast(LongType()))

        # 3. Normalizar strings
        .withColumn("status", upper(trim(col("status"))))
        .withColumn("currency", upper(trim(col("currency"))))

        # 4. Filtrar registros inválidos y dejar constancia
        .filter(col("order_id").isNotNull())
        .filter(col("total_amount") >= 0)

        # 5. Eliminar columnas de Bronze que no pertenecen a Silver
        .drop("_ingestion_timestamp", "_source_system", "_batch_id")
        .withColumn("_silver_timestamp", current_timestamp())
    )

    # Upsert con Delta MERGE (idempotente)
    if DeltaTable.isDeltaTable(spark, "/mnt/silver/orders"):
        target = DeltaTable.forPath(spark, "/mnt/silver/orders")
        (
            target.alias("t")
            .merge(silver_df.alias("s"), "t.order_id = s.order_id")
            .whenMatchedUpdateAll()
            .whenNotMatchedInsertAll()
            .execute()
        )
    else:
        silver_df.write.format("delta").save("/mnt/silver/orders")

    print(f"✅ Silver: {silver_df.count()} órdenes procesadas")
```

### Por qué usar MERGE en Silver

El MERGE de Delta Lake hace que la transformación sea **idempotente**: puedes correrla dos veces y el resultado es el mismo. Esto es crítico para reprocessar datos históricos sin duplicar registros.

## Capa Gold: agregaciones para el negocio

Gold produce las tablas que el negocio consume directamente. Una por cada "caso de uso" analítico.

```python
def build_gold_sales_summary():
    """
    Tabla Gold: resumen de ventas por día, categoría y región.
    Esta es exactamente la tabla que conecta Power BI.
    """
    orders   = spark.read.format("delta").load("/mnt/silver/orders")
    products = spark.read.format("delta").load("/mnt/silver/products")
    customers= spark.read.format("delta").load("/mnt/silver/customers")

    gold_df = (
        orders
        .join(products,  "product_id",  "left")
        .join(customers, "customer_id", "left")
        .groupBy(
            "order_date",
            "category",
            customers.region
        )
        .agg(
            count("order_id")               .alias("num_orders"),
            sum("total_amount")             .alias("revenue"),
            avg("total_amount")             .alias("avg_order_value"),
            countDistinct("customer_id")    .alias("unique_customers"),
        )
        .withColumn("_gold_timestamp", current_timestamp())
    )

    # Gold siempre se sobreescribe (es derivada)
    (
        gold_df.write
        .format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .partitionBy("order_date")
        .save("/mnt/gold/sales_summary")
    )
```

## Orquestación con Azure Data Factory

El pipeline de ADF orquesta las tres capas en secuencia:

```
[Trigger diario 2AM]
    → Notebook Bronze (ingesta incremental)
    → Notebook Silver (transform + merge)
    → Notebook Gold   (rebuild agregaciones)
    → Activity: enviar email de confirmación
```

La parte más importante: **configurar los reintentos**. Si Bronze falla (por timeout de API, por ejemplo), ADF reintenta 3 veces antes de alertar. Silver y Gold no corren si Bronze falló.

## Resultados en producción

Después de 6 meses con este sistema:

- **0 discrepancias** entre los reportes de distintas áreas (todos leen de Gold)
- **Tiempo de preparación de datos** para analistas: de 3 horas → 0 (los datos ya están listos)
- **Reproducibilidad**: con Delta Time Travel, puedo reconstruir cualquier estado histórico con `VERSION AS OF`
- **Costo**: ~$320 USD/mes en compute (Databricks clusters apagados cuando no procesan)

## El comando que más uso en producción

```sql
-- Ver historial de cambios de una tabla Delta
DESCRIBE HISTORY delta.`/mnt/silver/orders`

-- Recuperar datos de hace 7 días si algo salió mal
SELECT * FROM delta.`/mnt/silver/orders` TIMESTAMP AS OF '2025-01-01'
```

---

¿Tienes datos en Azure que necesitan gobernanza y estructura? [Cuéntame tu caso.](https://wa.me/529983253195?text=Hola%20Edgar%2C%20le%C3%AD%20sobre%20Medallion%20Architecture%20y%20me%20interesa%20implementarlo)
