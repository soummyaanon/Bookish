import { pdfjs } from "react-pdf"

export interface PDFPage {
  pageNumber: number
  imageDataUrl: string
  width: number
  height: number
}

let workerInitialized = false

function initWorker() {
  if (!workerInitialized && typeof window !== "undefined") {
    // Use unpkg which is more reliable than cdnjs for react-pdf
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
    workerInitialized = true
  }
}

export async function extractPDFPages(file: File, onProgress?: (progress: number) => void): Promise<PDFPage[]> {
  // Initialize worker before using pdfjs
  initWorker()

  const arrayBuffer = await file.arrayBuffer()

  try {
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
    })

    const pdf = await loadingTask.promise
    const totalPages = pdf.numPages
    const pages: PDFPage[] = []

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i)

      // Render at good resolution
      const scale = 2
      const viewport = page.getViewport({ scale })

      // Create canvas for rendering
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("Could not get canvas context")
      }

      canvas.width = viewport.width
      canvas.height = viewport.height

      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise

      // Convert to data URL with better quality
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92)

      pages.push({
        pageNumber: i,
        imageDataUrl,
        width: viewport.width,
        height: viewport.height,
      })

      // Report progress
      if (onProgress) {
        onProgress((i / totalPages) * 100)
      }
    }

    return pages
  } catch (error) {
    console.error("PDF extraction error:", error)
    throw error
  }
}
