# Enterprise RAG System Backend

A production-ready Retrieval-Augmented Generation (RAG) system built with Node.js, featuring advanced document processing, vector search, and intelligent question answering.

## 🚀 Features

- **PDF Document Processing**: Upload and parse PDF documents with automatic text extraction
- **Intelligent Chunking**: Smart text chunking with overlap for optimal retrieval
- **Vector Embeddings**: Generate embeddings using OpenAI's embedding models
- **Hybrid Search**: Combine semantic vector search with keyword-based search
- **Query Classification**: Automatically classify queries by complexity (simple/medium/complex)
- **Multi-Query Retrieval**: Generate multiple query variations for complex questions
- **Context Re-ranking**: LLM-powered re-ranking of retrieved chunks by relevance
- **Context Compression**: Extract only relevant information from chunks
- **Conversational Memory**: Maintain chat history for contextual responses
- **Streaming Responses**: Real-time streaming of LLM responses
- **Model Selection**: Dynamic model selection based on query complexity
- **Asynchronous Processing**: Background document embedding and query processing via BullMQ job queues
- **Security Guardrails**: Automatic detection and blocking of prompt injection attempts
- **Self-Verification**: LLM-powered verification layer for complex query accuracy
- **In-memory Caching**: Fast retrieval for frequent or identical questions
- **Request Rate Limiting**: Protection against API abuse and cost overruns

## 🏗️ Architecture

### Layered Architecture

```
┌─────────────────┐
│   Routes        │  ← API endpoints
├─────────────────┤
│   Controllers   │  ← Request handling & validation
├─────────────────┤
│   Services      │  ← Business logic & orchestration
├─────────────────┤
│   Models        │  ← Data models & database schemas
├─────────────────┤
│   Utils         │  ← Pure utility functions
└─────────────────┘
```

### Core Components

#### **Services Layer**
- **`rag.service.js`**: Main RAG orchestration (query processing, retrieval, generation)
- **`embedding.service.js`**: Text embedding generation
- **`vector.service.js`**: Vector search operations (hybrid search)
- **`ranking.service.js`**: LLM-powered chunk re-ranking
- **`queryRewriter.service.js`**: Multi-query generation for complex questions
- **`pdf.service.js`**: PDF text extraction and processing

#### **Utils Layer**
- **`chunk.util.js`**: Text chunking, compression, and ordering utilities
- **`query.util.js`**: Query classification and analysis
- **`tokenizer.util.js`**: Token encoding/decoding for chunking
- **`extract.util.js`**: JSON/array extraction from LLM responses
- **`logger.util.js`**: Centralized logging utility

#### **Jobs Layer**
- **`embedding.job.js`**: Background document processing and embedding generation

#### **Configuration Layer**
- **`db.js`**: MongoDB connection setup
- **`openai.js`**: OpenAI/OpenRouter client configuration
- **`env.js`**: Environment variables management

### Data Flow

1. **Document Upload**:
   ```
   PDF Upload → Text Extraction → Chunking → Embedding Generation → Vector Storage
   ```

2. **Question Answering**:
   ```
   Query → Classification → Multi-Query Generation → Hybrid Search →
   Re-ranking → Context Compression → LLM Generation → Response
   ```

## 🛠️ Tech Stack

- **Runtime**: Node.js with ES6 modules
- **Framework**: Express.js
- **Database**: MongoDB with Atlas Vector Search
- **LLM Provider**: OpenRouter (access to multiple models)
- **Embeddings**: OpenAI text-embedding-3-small
- **PDF Processing**: pdf-parse
- **File Upload**: Multer
- **Processing**: BullMQ with Redis (IORedis)
- **Security**: express-rate-limit for endpoint protection
- **Tokenization**: GPT Tokenizer
- **Development**: Nodemon for hot reload

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd rag_system_backend

# Install dependencies
npm install
```

## ⚙️ Environment Setup

Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rag_db
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### Environment Variables

- `PORT`: Server port (default: 3000)
- `MONGODB_URI`: MongoDB Atlas connection string
- `OPENROUTER_API_KEY`: OpenRouter API key for LLM access

## 🚀 Running the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Upload Document
```http
POST /api/upload
Content-Type: multipart/form-data

Form Data:
- file: PDF file
```

**Response:**
```json
{
  "message": "PDF processed successfully"
}
```

### Ask Question (Asynchronous)
```http
POST /api/ask
Content-Type: application/json

{
  "question": "What is the main topic of the document?",
  "sessionId": "unique-session-identifier"
}
```

**Response:**
```json
{
  "jobId": "123",
  "status": "processing"
}
```

### Ask Question (Streaming)
```http
POST /api/ask-stream
Content-Type: application/json

{
  "question": "Explain this concept in detail",
  "sessionId": "unique-session-identifier"
}
```

**Response:** Server-sent events stream

## 🗂️ Project Structure

```
src/
├── app.js                 # Express app configuration
├── server.js             # Server entry point
├── config/               # Configuration files
│   ├── db.js            # Database connection
│   ├── env.js           # Environment variables
│   └── openai.js        # LLM client setup
├── controllers/          # Request handlers
│   ├── ask.controller.js
│   └── upload.controller.js
├── jobs/                 # Background processing
│   └── embedding.job.js
├── middleware/           # Express middleware
│   ├── error.middleware.js
│   └── upload.middleware.js
├── models/               # Database schemas
│   ├── chat.model.js
│   └── document.model.js
├── queue/               # BullMQ queue definitions
│   └── aiQueue.js
├── routes/               # API route definitions
│   ├── ask.routes.js
│   └── upload.routes.js
├── services/             # Business logic services
│   ├── embedding.service.js
│   ├── guardrail.service.js
│   ├── pdf.service.js
│   ├── queryRewriter.service.js
│   ├── rag.service.js
│   ├── ranking.service.js
│   ├── vector.service.js
│   └── verification.service.js
├── utils/                # Utility functions
│   ├── cache.util.js
│   ├── chunk.util.js
│   ├── extract.util.js
│   ├── logger.util.js
│   ├── query.util.js
│   ├── tokenizer.util.js
│   └── tokenGuard.util.js
└── worker/               # Background job workers
    └── aiWorker.js
```

## 🔄 RAG Pipeline Details

### 1. Query Classification
- Analyzes question complexity based on keywords and length
- Categories: `simple` (≤4 words), `medium` (5-10 words), `complex` (>10 words or technical keywords)

### 2. Multi-Query Retrieval
- Generates multiple query variations for complex questions
- Uses LLM to create diverse search queries
- Parallel embedding generation and search

### 3. Hybrid Search
- Combines vector similarity search with keyword matching
- Retrieves top-k results from each query variation
- Deduplicates results across all queries

### 4. Context Re-ranking
- LLM evaluates chunk relevance to original question
- Reorders chunks by importance
- Filters to optimal context size

### 5. Context Compression
- Extracts only relevant information from each chunk
- Reduces token usage while maintaining accuracy
- Structures context with primary/supporting evidence labels

### 6. Conversational Memory
- Maintains chat history per session
- Includes previous Q&A in context
- Enables follow-up questions

### 7. Dynamic Model Selection
- `gpt-4o-mini` for simple/medium queries
- `qwen/qwen3.5-35b-a3b` for complex queries
- Balances cost and capability

## 🔮 Future Enhancements

- **Authentication & Authorization**: User management and API security
- **Rate Limiting**: Request throttling and abuse prevention
- **Caching Layer**: Redis for embedding and response caching
- **Document Management**: CRUD operations for uploaded documents
- **Analytics Dashboard**: Usage metrics and performance monitoring
- **Multi-format Support**: Word, PowerPoint, and other document types
- **Advanced Chunking**: Semantic chunking with document structure awareness
- **Hybrid Storage**: Combine MongoDB with Pinecone/Weaviate for vector storage
- **API Versioning**: Support multiple API versions
- **Containerization**: Docker and Kubernetes deployment
- **Monitoring**: Application performance monitoring and alerting

## 📄 License

ISC

## 👤 Author

Sabareesh
