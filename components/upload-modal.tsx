"use client"

import type React from "react"

import { useState, useCallback } from "react"
import type { BookData } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, X, CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractPDFPages } from "@/lib/pdf-utils"

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (book: BookData) => void
}

export function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile)
      setError(null)
    } else {
      setError("Please upload a valid PDF file")
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
    } else {
      setError("Please upload a valid PDF file")
    }
  }, [])

  const processFile = useCallback(async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)

    try {
      const pages = await extractPDFPages(file, (prog) => {
        setProgress(prog)
      })

      const bookData: BookData = {
        id: crypto.randomUUID(),
        title: file.name.replace(".pdf", ""),
        pages,
        currentPage: 0,
      }

      onUpload(bookData)
      resetState()
    } catch (err) {
      console.error("PDF processing error:", err)
      setError("Failed to process PDF. Please make sure it's a valid PDF file.")
    } finally {
      setIsProcessing(false)
    }
  }, [file, onUpload])

  const resetState = () => {
    setFile(null)
    setProgress(0)
    setError(null)
    setIsProcessing(false)
  }

  const handleClose = () => {
    if (!isProcessing) {
      resetState()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload PDF</DialogTitle>
          <DialogDescription>Upload a PDF file to convert it into an interactive book</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-center text-sm text-foreground">
                Drag and drop your PDF here, or{" "}
                <label className="cursor-pointer text-primary hover:underline">
                  browse
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileSelect} />
                </label>
              </p>
              <p className="mt-1 text-center text-xs text-muted-foreground">PDF files up to 50MB</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {!isProcessing && (
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {isProcessing && progress === 100 && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>

              {isProcessing && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Processing PDF...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={processFile} disabled={!file || isProcessing} className="gap-2">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Convert to Book
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
