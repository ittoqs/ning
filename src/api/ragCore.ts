// Utility to calculate cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Utility to split text into chunks of max `chunkSize` characters, preserving word boundaries
export function splitTextIntoChunks(text: string, chunkSize: number = 800): string[] {
  // Clean text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  
  let currentIndex = 0;
  while (currentIndex < cleanText.length) {
    let nextIndex = currentIndex + chunkSize;
    
    if (nextIndex < cleanText.length) {
      // Try to find a sentence boundary (., !, ?) near the chunkSize
      const sub = cleanText.substring(currentIndex, nextIndex + 50);
      const lastPunc = Math.max(sub.lastIndexOf('. '), sub.lastIndexOf('! '), sub.lastIndexOf('? '));
      
      if (lastPunc !== -1 && lastPunc > chunkSize * 0.5) {
        nextIndex = currentIndex + lastPunc + 1; // include punctuation
      } else {
        // Fallback to nearest space
        const lastSpace = cleanText.substring(currentIndex, nextIndex).lastIndexOf(' ');
        if (lastSpace !== -1 && lastSpace > chunkSize * 0.5) {
          nextIndex = currentIndex + lastSpace;
        }
      }
    }
    
    chunks.push(cleanText.substring(currentIndex, nextIndex).trim());
    currentIndex = nextIndex;
  }
  
  return chunks.filter(c => c.length > 10);
}

// Read simple text files
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export async function readPdfFile(file: File): Promise<string> {
  try {
    // Load pustaka PDF dari folder lokal /public/lib/ agar 100% offline
    // @ts-ignore: TypeScript cannot resolve dynamic public folder imports
    const pdfjsLib = await import(/* @vite-ignore */ window.location.origin + '/lib/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/lib/pdf.worker.mjs';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error("PDF Parsing error:", error);
    throw new Error("Failed to read PDF file. Make sure the format is correct.");
  }
}
