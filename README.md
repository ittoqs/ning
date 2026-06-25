<div align="center">
  <img src="public/logo.svg" alt="Ning Logo" width="120"/>
  <h1>Ning</h1>
  <p><strong>Think Local, Total Protection.</strong></p>
</div>

Ning is a privacy-first, local AI desktop and web client built around [Ollama](https://ollama.com/). It offers a beautiful, enterprise-grade React interface bundled into a lightweight, standalone native Desktop application using Tauri. Zero telemetry, zero cloud dependencies, and your data never leaves your machine.

---

## ✨ Features

- **100% Offline & Private:** Your chats and documents are processed locally by models running directly on your hardware.
- **Built-in Local RAG:** Upload PDFs, Markdown, TXT, or CSVs to chat with your documents. Text extraction and vector embeddings (`nomic-embed-text`) happen entirely on your device.
- **Hardware-Aware (Tauri):** The Rust backend seamlessly reads your actual CPU cores and available RAM in real-time, helping you avoid crashing your system with oversized models.
- **AI Models Library:** Search for popular models or perform a "Custom Pull" for any obscure model from the Ollama registry without touching a terminal.
- **Model Context Protocol (MCP):** Connect external tools (like local filesystems or custom scripts) directly to your AI's context.

## 🚀 Getting Started (Web Version)

If you want to run Ning locally in your browser for development purposes:

### 1. Prerequisites
- **Node.js** (v18+)
- **Ollama**: Must be installed and running on your machine.

### 2. Configure Ollama for Web Access
By default, Ollama blocks browser connections (CORS). You must start Ollama with the following environment variable:
```bash
# macOS / Linux
OLLAMA_ORIGINS="*" ollama serve

# Windows (Command Prompt)
set OLLAMA_ORIGINS="*" && ollama serve
```

### 3. Install & Run Ning
```bash
git clone repo.git
cd \dir
npm install
npm run dev
```
