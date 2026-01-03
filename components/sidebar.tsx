"use client"

import { cn } from "@/lib/utils"
import type { BookData, ThemeMode, RenderMode } from "@/app/page"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Book, Upload, X, Trash2, BookOpen, Moon, Sun, Flame, Sparkles, Eye, Contrast } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  books: BookData[]
  activeBook: BookData | null
  onSelectBook: (book: BookData) => void
  onUploadClick: () => void
  onDeleteBook: (bookId: string) => void
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  renderMode: RenderMode
  onRenderModeChange: (mode: RenderMode) => void
}

export function Sidebar({
  isOpen,
  onClose,
  books,
  activeBook,
  onSelectBook,
  onUploadClick,
  onDeleteBook,
  theme,
  onThemeChange,
  renderMode,
  onRenderModeChange,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">Readany</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Upload button */}
        <div className="p-4">
          <Button onClick={onUploadClick} className="w-full gap-2">
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
        </div>

        <div className="px-4 pb-4">
          <h2 className="text-xs font-medium text-sidebar-foreground/60 mb-2">Theme</h2>
          <div className="flex gap-1 p-1 bg-sidebar-accent/50 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 gap-1.5 h-9",
                theme === "light"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
              onClick={() => onThemeChange("light")}
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 gap-1.5 h-9",
                theme === "dark"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
              onClick={() => onThemeChange("dark")}
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 gap-1.5 h-9",
                theme === "red"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
              onClick={() => onThemeChange("red")}
            >
              <Flame className="h-4 w-4" />
              Red
            </Button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <h2 className="text-xs font-medium text-sidebar-foreground/60 mb-2">Render Mode</h2>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-9",
                renderMode === "normal"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
              onClick={() => onRenderModeChange("normal")}
            >
              <Eye className="h-4 w-4" />
              Normal
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-9",
                renderMode === "high-contrast"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
              onClick={() => onRenderModeChange("high-contrast")}
            >
              <Contrast className="h-4 w-4" />
              High Contrast
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-9",
                renderMode === "sepia"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
              onClick={() => onRenderModeChange("sepia")}
            >
              <Sparkles className="h-4 w-4" />
              Sepia
            </Button>
          </div>
        </div>

        {/* Books list */}
        <div className="flex-1 overflow-hidden">
          <div className="px-4 py-2">
            <h2 className="text-sm font-medium text-sidebar-foreground/60">My Library</h2>
          </div>
          <ScrollArea className="h-[calc(100%-40px)] px-2">
            {books.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <Book className="mb-3 h-12 w-12 text-sidebar-foreground/30" />
                <p className="text-sm text-sidebar-foreground/60">No books yet. Upload a PDF to get started.</p>
              </div>
            ) : (
              <div className="space-y-1 pb-4">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer",
                      activeBook?.id === book.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    )}
                    onClick={() => onSelectBook(book)}
                  >
                    <Book className="h-4 w-4 shrink-0" />
                    <div className="flex-1 truncate">
                      <p className="truncate text-sm font-medium">{book.title}</p>
                      <p className="text-xs opacity-60">{book.pages.length} pages</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-sidebar-foreground hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteBook(book.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </aside>
    </>
  )
}
