---
title: "RAG Empresarial con Azure OpenAI: cómo construí un chatbot sobre 5 años de documentación interna"
description: "Guía práctica de implementación de un sistema RAG (Retrieval-Augmented Generation) con Azure OpenAI, LangChain y Pinecone. Desde los embeddings hasta la API en producción."
pubDate: 2025-03-10
tags: ["IA", "RAG", "Azure OpenAI", "LangChain", "Python"]
readingTime: 12
featured: true
---

El cliente tenía **5 años de documentación interna**: SOPs, contratos, manuales de producto, reportes de proyectos. Todo en PDFs y Word en SharePoint. Nadie los leía. Nadie sabía dónde estaba lo que necesitaba.

La solución no era un buscador. Era un sistema que entendiera preguntas en lenguaje natural y respondiera con la información específica del documento correcto.

Eso es RAG. Y en este artículo te muestro cómo lo construí.

## Qué es RAG y por qué no es solo "subir documentos a ChatGPT"

RAG (Retrieval-Augmented Generation) combina dos componentes:

1. **Retrieval**: buscar los fragmentos relevantes de tus documentos usando búsqueda semántica (embeddings + base vectorial)
2. **Generation**: usar un LLM para generar una respuesta usando esos fragmentos como contexto

La diferencia con "subir un PDF a ChatGPT":
- **Escala**: funciona con miles de documentos, no solo uno
- **Privacidad**: los datos nunca salen de tu infraestructura Azure
- **Actualización**: agregar nuevos documentos es automático
- **Trazabilidad**: sabes exactamente qué fragmento generó qué respuesta

## Arquitectura del sistema

```
[SharePoint / PDFs] 
        ↓
[Document Processor] → chunking + cleaning
        ↓
[Azure OpenAI Embeddings] → text-embedding-ada-002
        ↓
[Pinecone] → almacén vectorial
        ↑
[FastAPI] ← query del usuario
        ↓
[Similarity Search] → top-5 chunks relevantes
        ↓
[Azure OpenAI GPT-4] → genera respuesta con contexto
        ↓
[Respuesta + referencias al documento fuente]
```

## Paso 1: Procesar e indexar los documentos

La parte más crítica (y menos glamorosa) es el preprocessing. La calidad del chunking determina la calidad de las respuestas.

```python
import os
from pathlib import Path
from langchain.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import AzureOpenAIEmbeddings
from langchain.vectorstores import Pinecone as PineconeStore
import pinecone

# Configuración
embeddings = AzureOpenAIEmbeddings(
    azure_deployment="text-embedding-ada-002",
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-02-01",
)

# Splitter: chunks de 1000 chars con 200 de overlap
# El overlap evita que la información se "corte" entre chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ".", " "],
)

def process_document(file_path: str) -> list[dict]:
    """Carga, divide y prepara un documento para indexación."""
    path = Path(file_path)

    if path.suffix == ".pdf":
        loader = PyPDFLoader(file_path)
    elif path.suffix in (".docx", ".doc"):
        loader = Docx2txtLoader(file_path)
    else:
        raise ValueError(f"Formato no soportado: {path.suffix}")

    docs   = loader.load()
    chunks = splitter.split_documents(docs)

    # Enriquecer metadata para trazabilidad
    for i, chunk in enumerate(chunks):
        chunk.metadata.update({
            "source_file": path.name,
            "chunk_index": i,
            "total_chunks": len(chunks),
        })

    return chunks

def index_directory(docs_path: str):
    """Indexa todos los documentos de un directorio en Pinecone."""
    pinecone.init(
        api_key=os.environ["PINECONE_API_KEY"],
        environment=os.environ["PINECONE_ENV"],
    )

    all_chunks = []
    for file in Path(docs_path).glob("**/*.{pdf,docx}"):
        print(f"Procesando: {file.name}")
        chunks = process_document(str(file))
        all_chunks.extend(chunks)
        print(f"  → {len(chunks)} chunks")

    # Subir a Pinecone en batches
    vectorstore = PineconeStore.from_documents(
        documents=all_chunks,
        embedding=embeddings,
        index_name="empresa-docs",
    )
    print(f"\n✅ Total indexado: {len(all_chunks)} chunks")
    return vectorstore
```

## Paso 2: El motor de consultas

```python
from langchain.chat_models import AzureChatOpenAI
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate

llm = AzureChatOpenAI(
    azure_deployment="gpt-4",
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-02-01",
    temperature=0.1,   # bajo para respuestas más precisas y reproducibles
    max_tokens=1500,
)

# Prompt personalizado — CRÍTICO para el comportamiento del sistema
SYSTEM_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""Eres un asistente experto en la documentación interna de la empresa.
Responde SOLO basándote en el contexto proporcionado.
Si la información no está en el contexto, di exactamente: "No encontré información sobre eso en la documentación disponible."
No inventes información ni uses conocimiento externo.

Contexto de los documentos:
{context}

Pregunta: {question}

Respuesta (incluye el nombre del documento fuente cuando sea posible):"""
)

def create_rag_chain(vectorstore):
    memory = ConversationBufferWindowMemory(
        memory_key="chat_history",
        return_messages=True,
        k=5,  # recuerda las últimas 5 interacciones
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5},  # top 5 chunks más relevantes
    )

    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        combine_docs_chain_kwargs={"prompt": SYSTEM_PROMPT},
        return_source_documents=True,  # para mostrar las referencias
    )
    return chain
```

## Paso 3: API con FastAPI

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="RAG Empresarial API")

# Inicializar una sola vez al arrancar
vectorstore = PineconeStore.from_existing_index(
    index_name="empresa-docs",
    embedding=embeddings,
)
chain = create_rag_chain(vectorstore)


class QueryRequest(BaseModel):
    question: str
    session_id: Optional[str] = "default"


class QueryResponse(BaseModel):
    answer:   str
    sources:  list[str]
    session_id: str


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía")

    result = chain({"question": request.question})

    # Extraer nombres de documentos fuente únicos
    sources = list({
        doc.metadata.get("source_file", "Desconocido")
        for doc in result.get("source_documents", [])
    })

    return QueryResponse(
        answer=result["answer"],
        sources=sources,
        session_id=request.session_id,
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
```

## Resultados y métricas en producción

Después de 2 meses en producción con 45 usuarios:

| Métrica | Valor |
|---|---|
| Tiempo promedio de respuesta | 2.1 segundos |
| Precisión (evaluación humana) | 91% |
| Preguntas respondidas/día | ~120 |
| Reducción de tickets internos de búsqueda | -68% |
| Documentos indexados | 847 |
| Costo Azure OpenAI mensual | $89 USD |

El **costo de $89 USD/mes** para eliminar el equivalente a 3-4 horas/día de búsqueda manual es el ROI más claro que he medido.

## Las 3 cosas que marcan la diferencia

**1. El chunking es más importante que el LLM.** Pasé más tiempo optimizando cómo dividir los documentos que eligiendo el modelo. Un chunk mal cortado da una respuesta mal informada, sin importar qué LLM uses.

**2. El prompt del sistema define el comportamiento.** La instrucción `"Si la información no está en el contexto, di exactamente..."` evita alucinaciones. Los LLMs tienden a inventar si no les das una salida clara.

**3. Guarda los documentos fuente en la respuesta.** La confianza del usuario sube dramáticamente cuando puede ver "esta respuesta viene del documento X, página Y". La trazabilidad no es opcional.

---

¿Tienes documentación interna que tu equipo no puede aprovechar? [Hablemos de implementar RAG en tu empresa.](https://wa.me/529981234567?text=Hola%20Edgar%2C%20le%C3%AD%20sobre%20RAG%20y%20me%20interesa%20implementarlo%20en%20mi%20empresa)
