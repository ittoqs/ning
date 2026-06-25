import { invoke } from '@tauri-apps/api/tauri';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

const OLLAMA_BASE_URL = 'http://localhost:11434';

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  details: {
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

const proxyRequest = async (method: string, url: string, body?: any): Promise<Response> => {
  if (isTauri()) {
    try {
      const res = await invoke<{status: number, text: string}>('proxy_request', {
        method,
        url,
        body: body ? JSON.stringify(body) : null
      });
      return new Response(res.text, { status: res.status });
    } catch (e: any) {
      throw new Error(e);
    }
  } else {
    const init: RequestInit = { method };
    if (body) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    return fetch(url, init);
  }
};

export const ollamaClient = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await proxyRequest('GET', `${OLLAMA_BASE_URL}/`);
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async fetchTags(): Promise<OllamaModel[]> {
    try {
      const res = await proxyRequest('GET', `${OLLAMA_BASE_URL}/api/tags`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      return data.models || [];
    } catch (e) {
      console.warn("Ollama is offline, using mock models.");
      return [
        {
          name: 'llama3.2:1b',
          size: 1_200_000_000,
          digest: 'mock-digest',
          details: { parameter_size: '1B', quantization_level: 'Q4_K_M' }
        },
        {
          name: 'mistral:latest',
          size: 4_100_000_000,
          digest: 'mock-digest2',
          details: { parameter_size: '7B', quantization_level: 'Q4_0' }
        }
      ];
    }
  },

  async fetchRunningModels(): Promise<OllamaModel[]> {
    try {
      const res = await proxyRequest('GET', `${OLLAMA_BASE_URL}/api/ps`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    } catch (e) {
      return [];
    }
  },

  async loadModel(name: string): Promise<boolean> {
    try {
      const response = await proxyRequest('POST', `${OLLAMA_BASE_URL}/api/generate`, { model: name, keep_alive: -1 });
      return response.ok;
    } catch (e) {
      console.error("Error loading model", e);
      return false;
    }
  },

  async unloadModel(name: string): Promise<boolean> {
    try {
      const response = await proxyRequest('POST', `${OLLAMA_BASE_URL}/api/generate`, { model: name, keep_alive: 0 });
      return response.ok;
    } catch (e) {
      console.error("Error unloading model", e);
      return false;
    }
  },

  async fetchEmbeddings(model: string, prompt: string): Promise<number[] | null> {
    try {
      const response = await proxyRequest('POST', `${OLLAMA_BASE_URL}/api/embeddings`, { model, prompt });
      if (!response.ok) return null;
      const data = await response.json();
      return data.embedding;
    } catch (e) {
      console.error("Error fetching embeddings:", e);
      return null;
    }
  },

  async chatStream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (err: any) => void,
    signal?: AbortSignal
  ) {
    const isOnline = await this.checkHealth();
    
    if (!isOnline) {
      console.warn("Ollama is offline, using mock streaming.");
      const mockResponse = "Ini adalah respons simulasi (Mock) karena Engine Ollama lokal belum berjalan atau Anda belum menginstal model di perangkat lokal. Anda akan melihat animasi ketik (streaming) ini sebagai fitur uji coba UI.";
      let i = 0;
      const interval = setInterval(() => {
        if (signal?.aborted) {
          clearInterval(interval);
          onError(new Error('Aborted'));
          return;
        }
        if (i < mockResponse.length) {
          onChunk(mockResponse.charAt(i));
          i++;
        } else {
          clearInterval(interval);
          onComplete();
        }
      }, 30);
      return;
    }

    if (isTauri()) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      let unlistenStream: UnlistenFn | null = null;
      let unlistenError: UnlistenFn | null = null;
      let unlistenDone: UnlistenFn | null = null;

      const cleanup = () => {
        if (unlistenStream) unlistenStream();
        if (unlistenError) unlistenError();
        if (unlistenDone) unlistenDone();
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          cleanup();
          onError(new Error('Aborted'));
        });
      }

      try {
        const decoder = new TextDecoder();
        unlistenStream = await listen<number[]>(`stream_${id}`, (event) => {
          if (signal?.aborted) return;
          const chunkStr = decoder.decode(new Uint8Array(event.payload), { stream: true });
          const lines = chunkStr.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
             try {
               const data = JSON.parse(line);
               if (data.message && data.message.content) {
                 onChunk(data.message.content);
               }
             } catch (e) {
               console.error("Error parsing JSON chunk", line);
             }
          }
        });

        unlistenError = await listen<string>(`stream_error_${id}`, (event) => {
          if (signal?.aborted) return;
          cleanup();
          onError(new Error(event.payload));
        });

        unlistenDone = await listen<void>(`stream_done_${id}`, () => {
          if (signal?.aborted) return;
          cleanup();
          onComplete();
        });

        await invoke('proxy_stream', {
          id,
          method: 'POST',
          url: `${OLLAMA_BASE_URL}/api/chat`,
          body: JSON.stringify({
            model,
            messages,
            stream: true
          })
        });
      } catch (e: any) {
        cleanup();
        onError(e);
      }
    } else {
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages,
            stream: true
          }),
          signal
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          if (signal?.aborted) {
            reader.cancel();
            throw new Error('Aborted');
          }

          const { done, value } = await reader.read();
          if (done) {
            onComplete();
            break;
          }

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message && data.message.content) {
                onChunk(data.message.content);
              }
            } catch (e) {
              console.error("Error parsing JSON chunk", line);
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message === 'Aborted') {
          onError(new Error('Aborted'));
        } else {
          onError(err);
        }
      }
    }
  },

  async pullModel(
    name: string,
    onProgress: (status: string, percent: number) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ) {
    const isOnline = await this.checkHealth();
    if (!isOnline) {
      onError(new Error("Ollama is offline. Pastikan server Ollama lokal berjalan."));
      return;
    }

    if (isTauri()) {
       const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
       let unlistenStream: UnlistenFn | null = null;
       let unlistenError: UnlistenFn | null = null;
       let unlistenDone: UnlistenFn | null = null;

       let successReceived = false;

       const cleanup = () => {
         if (unlistenStream) unlistenStream();
         if (unlistenError) unlistenError();
         if (unlistenDone) unlistenDone();
       };

       try {
          const decoder = new TextDecoder();
          unlistenStream = await listen<number[]>(`stream_${id}`, (event) => {
             const chunkStr = decoder.decode(new Uint8Array(event.payload), { stream: true });
             const lines = chunkStr.split('\n').filter(line => line.trim() !== '');
             for (const line of lines) {
                try {
                  const data = JSON.parse(line);
                  if (data.status) {
                    if (data.status === 'success') {
                      successReceived = true;
                    }
                    let percent = 0;
                    if (data.total && data.completed) {
                      percent = Math.round((data.completed / data.total) * 100);
                    }
                    onProgress(data.status, percent);
                  }
                  if (data.error) {
                    cleanup();
                    onError(new Error(data.error));
                    return;
                  }
                } catch (e) {
                  // ignore JSON parse error for partial chunks
                }
             }
          });

          unlistenError = await listen<string>(`stream_error_${id}`, (event) => {
            cleanup();
            onError(new Error(event.payload));
          });

          unlistenDone = await listen<void>(`stream_done_${id}`, () => {
            cleanup();
            if (successReceived) {
              onComplete();
            } else {
              onError(new Error("Connection closed unexpectedly."));
            }
          });

          await invoke('proxy_stream', {
            id,
            method: 'POST',
            url: `${OLLAMA_BASE_URL}/api/pull`,
            body: JSON.stringify({ name, stream: true })
          });
       } catch (e: any) {
          cleanup();
          onError(e);
       }
    } else {
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, stream: true })
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let successReceived = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (successReceived) {
              onComplete();
            } else {
              onError(new Error("Connection closed unexpectedly."));
            }
            break;
          }

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.status) {
                if (data.status === 'success') {
                  successReceived = true;
                }
                let percent = 0;
                if (data.total && data.completed) {
                  percent = Math.round((data.completed / data.total) * 100);
                }
                onProgress(data.status, percent);
              }
              if (data.error) {
                onError(new Error(data.error));
                return;
              }
            } catch (e) {
              // ignore JSON parse error for partial chunks
            }
          }
        }
      } catch (err) {
        onError(err);
      }
    }
  }
};
