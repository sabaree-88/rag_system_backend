# 🧠 Final GenAI RAG System Architecture

> Your system is now a **multi-stage intelligent retrieval pipeline**.

---

## High-Level Flow

```
User Question
     ↓
Query Rewriting (Multi-Query)
     ↓
Parallel Embedding Generation
     ↓
Hybrid Retrieval (Vector + Keyword)
     ↓
Merge & Deduplicate Results
     ↓
LLM Re-Ranking
     ↓
Context Compression
     ↓
Context Ordering
     ↓
Prompt Construction
     ↓
Streaming LLM Response
     ↓
Conversation Memory Storage
```

---

## 1️⃣ User Query Layer

The pipeline starts when the user asks a question.

**Example:**
```
"What is vector search?"
```

Input enters your backend via:
- `ask.controller.js`

This triggers:
- `rag.service.js`

---

## 2️⃣ Query Rewriting Layer (Multi-Query Retrieval)

**Problem solved:** One query may miss relevant chunks.

**Solution:** LLM rewrites query into multiple variations.

**Example:**

| | Query |
|---|---|
| **Original** | `"What is vector search?"` |
| **Variation 1** | `vector search explanation` |
| **Variation 2** | `how vector databases work` |
| **Variation 3** | `semantic similarity search` |

**Implementation:** `queryRewriter.service.js`

**Protection added:**
```js
try {
  parse JSON
} catch {
  fallback to original query  // avoids parse errors
}
```

---

## 3️⃣ Parallel Embedding Generation

Each query variation is converted into an embedding vector.

```
Queries
  ↓
Embedding Model (text-embedding-3-small)
  ↓
Vectors
```

**Optimization:** `Promise.all()` — generates all embeddings in parallel.

> **Timing improvement:** `multi-query-retrieval: 10s → faster`

---

## 4️⃣ Hybrid Retrieval Layer

Two retrieval methods run simultaneously.

### Vector Search — `MongoDB $vectorSearch`
Finds **semantic similarity**.
```
"semantic search"  ≈  "meaning-based retrieval"
```

### Keyword Search — `MongoDB $search`
Finds **exact keyword matches**.
```
"MongoDB vector index"  →  exact string match
```

### Combined:
```
Vector Results
      +
Keyword Results
      ↓
Merged Results
```

**Benefits:** Better Recall + Better Precision

---

## 5️⃣ Result Merge + Deduplication

Multi-query retrieval produces overlapping chunks across variations.

**Problem:**
```
Query 1 → chunk A
Query 2 → chunk A
Query 3 → chunk A
```

**Solution:**
```js
uniqueChunks = Map(chunkId)
```

**Result:** Top ~10 unique candidate chunks.

---

## 6️⃣ Re-Ranking Layer (LLM Intelligence)

The LLM scores which chunks are most relevant to the original query.

```
Top 10 chunks
      ↓
LLM scoring
      ↓
Top 3 chunks
```

**Implementation:** `reranker.service.js`

> **Log timing:** `rerank: 1.301s` ← expected for an LLM step

**Benefit:** Dramatically improves precision.

---

## 7️⃣ Context Compression Layer

**Problem:** Chunks often contain unnecessary surrounding text.

**Raw chunk (before compression):**
```
Vector search allows similarity search...
It is used in machine learning systems...
MongoDB Atlas supports vector indexes...
Vector search works by...
```

**After LLM compression:**
```
Vector search allows similarity search using embeddings.
```

```
Chunk
 ↓
LLM compression
 ↓
Important sentences only
```

**Benefits:** Lower tokens · Lower cost · Better answers

---

## 8️⃣ Context Ordering Layer

> **Key LLM behavior:** Models pay more attention to early tokens in the prompt.

So chunks are reordered by relevance score before injection:

```
Highest relevance   ← injected first
↓
Medium relevance
↓
Supporting context  ← injected last
```

**Implementation:** `sort by rerankScore`

---

## 9️⃣ Prompt Construction

Final prompt structure sent to the LLM:

```
┌─────────────────────────────────┐
│         System Prompt           │
│  You are a helpful AI assistant │
├─────────────────────────────────┤
│            Context              │
│  [Chunk 1 — highest relevance]  │
│  [Chunk 2 — medium relevance]   │
│  [Chunk 3 — supporting]         │
├─────────────────────────────────┤
│          User Question          │
│  "What is vector search?"       │
└─────────────────────────────────┘
```

This is **controlled knowledge injection**.

---

## 🔟 LLM Response Generation

Final answer generated using:
- **OpenAI Chat Completion**
- **`stream: true`**

---

## 1️⃣1️⃣ Streaming Layer

Instead of waiting for the full response, tokens are pushed as they arrive:

```
LLM → token → token → token → ...
           ↓
       res.write(token)
```

Creates the **ChatGPT-style typing effect**.

> **Log timing:** `final-llm: 6.359s` — streaming improves *perceived* latency.

---

## 1️⃣2️⃣ Memory Storage Layer

After streaming ends, the conversation is persisted to MongoDB:

```json
{ "sessionId": "...", "role": "user",      "message": "What is vector search?" }
{ "sessionId": "...", "role": "assistant", "message": "Vector search is..." }
```

**Enables follow-up questions:**
```
User: What is vector search?
User: How does it work in MongoDB?   ← model remembers previous turn
```

---

## 🧠 Full Pipeline Diagram

```
                USER
                 │
                 ▼
        Ask Controller
                 │
                 ▼
          RAG Service
                 │
                 ▼
        Query Rewriter (LLM)
                 │
                 ▼
      Multi Query Variations
                 │
                 ▼
      Parallel Embedding Layer
                 │
                 ▼
         Hybrid Retrieval
       (Vector + Keyword)
                 │
                 ▼
       Merge + Deduplicate
                 │
                 ▼
           LLM Re-Ranker
                 │
                 ▼
        Context Compression
                 │
                 ▼
          Context Ordering
                 │
                 ▼
         Prompt Construction
                 │
                 ▼
       LLM Streaming Response
                 │
                 ▼
         Memory Persistence
```

---

## 📊 System Capabilities

| Capability | Status |
|---|---|
| Multi-query retrieval | ✅ |
| Hybrid search (Vector + Keyword) | ✅ |
| LLM re-ranking | ✅ |
| Context compression | ✅ |
| Context ordering | ✅ |
| Streaming responses | ✅ |
| Conversation memory | ✅ |