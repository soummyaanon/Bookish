"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { BookReader } from "@/components/book-reader"
import { UploadModal } from "@/components/upload-modal"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PDFPage } from "@/lib/pdf-utils"

export type ThemeMode = "light" | "dark" | "red"
export type RenderMode = "normal" | "high-contrast" | "sepia"

export interface BookData {
  id: string
  title: string
  pages: PDFPage[]
  currentPage: number
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [books, setBooks] = useState<BookData[]>([])
  const [activeBook, setActiveBook] = useState<BookData | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>("dark")
  const [renderMode, setRenderMode] = useState<RenderMode>("normal")

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("dark", "red-theme")
    if (theme === "dark") {
      root.classList.add("dark")
    } else if (theme === "red") {
      root.classList.add("red-theme")
    }
  }, [theme])

  const handleBookUpload = (book: BookData) => {
    setBooks((prev) => [...prev, book])
    setActiveBook(book)
    setUploadModalOpen(false)
  }

  const handleSelectBook = (book: BookData) => {
    setActiveBook(book)
  }

  const handlePageChange = (page: number) => {
    if (activeBook) {
      const updatedBook = { ...activeBook, currentPage: page }
      setActiveBook(updatedBook)
      setBooks((prev) => prev.map((b) => (b.id === activeBook.id ? updatedBook : b)))
    }
  }

  const handleDeleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId))
    if (activeBook?.id === bookId) {
      setActiveBook(null)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar - Pass theme and render mode props */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        books={books}
        activeBook={activeBook}
        onSelectBook={handleSelectBook}
        onUploadClick={() => setUploadModalOpen(true)}
        onDeleteBook={handleDeleteBook}
        theme={theme}
        onThemeChange={setTheme}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
      />

      {/* Main content area - Pass theme and render mode */}
      <main className="flex-1 overflow-hidden">
        <BookReader
          book={activeBook}
          onPageChange={handlePageChange}
          onUploadClick={() => setUploadModalOpen(true)}
          theme={theme}
          renderMode={renderMode}
        />
      </main>

      {/* Upload modal */}
      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onUpload={handleBookUpload} />
    </div>
  )
}
