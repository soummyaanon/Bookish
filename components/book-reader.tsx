"use client"
import { useRef, useState, useEffect, useCallback, forwardRef } from "react"
import HTMLFlipBook from "react-pageflip"
import type { BookData, ThemeMode, RenderMode } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Upload, BookOpen, Volume2, VolumeX } from "lucide-react"
import { usePageFlipSound } from "@/hooks/use-page-flip-sound"

interface BookReaderProps {
  book: BookData | null
  onPageChange: (page: number) => void
  onUploadClick: () => void
  theme: ThemeMode
  renderMode: RenderMode
}

const getThemeStyles = (theme: ThemeMode, renderMode: RenderMode) => {
  const base = {
    light: {
      pageBg: "#ffffff",
      pageText: "#1a1a1a",
      canvasBg: "#e5e5e5",
      shadow: "rgba(0,0,0,0.2)",
      spineBg: "#d0d0d0",
      spineGradient: "linear-gradient(90deg, #a0a0a0 0%, #d0d0d0 50%, #a0a0a0 100%)",
    },
    dark: {
      pageBg: "#1f1f1f",
      pageText: "#e5e5e5",
      canvasBg: "#0a0a0a",
      shadow: "rgba(0,0,0,0.5)",
      spineBg: "#2a2a2a",
      spineGradient: "linear-gradient(90deg, #1a1a1a 0%, #3a3a3a 50%, #1a1a1a 100%)",
    },
    red: {
      pageBg: "#f5e6d3",
      pageText: "#2d1810",
      canvasBg: "#1a0f0f",
      shadow: "rgba(50,20,10,0.4)",
      spineBg: "#3d2d20",
      spineGradient: "linear-gradient(90deg, #2d1d10 0%, #4d3d30 50%, #2d1d10 100%)",
    },
  }

  const styles = { ...base[theme] }

  if (renderMode === "high-contrast") {
    styles.pageBg = theme === "dark" ? "#000000" : "#ffffff"
    styles.pageText = theme === "dark" ? "#ffffff" : "#000000"
  } else if (renderMode === "sepia") {
    styles.pageBg = "#f4ecd8"
    styles.pageText = "#5c4033"
  }

  return styles
}

interface PageProps {
  pageNumber: number
  imageDataUrl?: string
  theme: ThemeMode
  renderMode: RenderMode
  totalPages: number
}

const Page = forwardRef<HTMLDivElement, PageProps>(
  ({ pageNumber, imageDataUrl, theme, renderMode, totalPages }, ref) => {
    const styles = getThemeStyles(theme, renderMode)

    const getFilter = () => {
      switch (renderMode) {
        case "high-contrast":
          return "contrast(1.3) brightness(1.1)"
        case "sepia":
          return "sepia(0.3) brightness(1.05)"
        default:
          return "none"
      }
    }

    return (
      <div
        ref={ref}
        className="page-content"
        style={{
          backgroundColor: styles.pageBg,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: `inset -2px 0 8px ${styles.shadow}`,
        }}
      >
        {/* Page content */}
        <div className="flex-1 relative overflow-hidden">
          {imageDataUrl ? (
            <img
              src={imageDataUrl || "/placeholder.svg"}
              alt={`Page ${pageNumber}`}
              className="w-full h-full object-contain"
              style={{
                filter: getFilter(),
                backgroundColor: styles.pageBg,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ color: styles.pageText }}>
              <span className="text-lg opacity-50">Loading page {pageNumber}...</span>
            </div>
          )}
        </div>

        {/* Page number footer */}
        <div
          className="flex-shrink-0 py-2 px-4 text-center text-sm border-t"
          style={{
            color: styles.pageText,
            borderColor: `${styles.pageText}20`,
            backgroundColor: styles.pageBg,
          }}
        >
          {pageNumber} / {totalPages}
        </div>
      </div>
    )
  },
)
Page.displayName = "Page"

const Cover = forwardRef<HTMLDivElement, { title: string; theme: ThemeMode; type: "front" | "back" }>(
  ({ title, theme, type }, ref) => {
    const isDark = theme === "dark" || theme === "red"

    return (
      <div
        ref={ref}
        className="cover"
        style={{
          backgroundColor: isDark ? "#1a1a1a" : "#2a2a2a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          padding: "2rem",
          backgroundImage: `linear-gradient(135deg, ${isDark ? "#2a2a2a" : "#3a3a3a"} 0%, ${isDark ? "#0a0a0a" : "#1a1a1a"} 100%)`,
        }}
      >
        {type === "front" ? (
          <>
            <BookOpen className="w-16 h-16 mb-6 opacity-60" />
            <h2 className="text-2xl font-bold text-center mb-2 line-clamp-3">{title}</h2>
            <p className="text-sm opacity-50 mt-4">Click or drag to flip pages</p>
          </>
        ) : (
          <>
            <BookOpen className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-lg opacity-60">End of Book</p>
          </>
        )}
      </div>
    )
  },
)
Cover.displayName = "Cover"

export function BookReader({ book, onPageChange, onUploadClick, theme, renderMode }: BookReaderProps) {
  const flipBookRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [currentPageDisplay, setCurrentPageDisplay] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 400, height: 550 })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFlipping, setIsFlipping] = useState(false)

  const { playFlipSound } = usePageFlipSound({
    enabled: soundEnabled,
    volume: 0.35,
  })

  const totalPages = book?.pages.length ?? 0
  const styles = getThemeStyles(theme, renderMode)

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const containerHeight = containerRef.current.clientHeight

        const maxWidth = Math.min(containerWidth * 0.85, 900)
        const maxHeight = containerHeight - 120

        const aspectRatio = 1.4
        let width = maxWidth / 2
        let height = width * aspectRatio

        if (height > maxHeight) {
          height = maxHeight
          width = height / aspectRatio
        }

        setDimensions({
          width: Math.floor(width),
          height: Math.floor(height),
        })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  const handleFlip = useCallback(
    (e: any) => {
      const newPage = e.data
      setCurrentPageDisplay(newPage)
      if (newPage > 0 && newPage <= totalPages) {
        onPageChange(newPage - 1)
      }
    },
    [onPageChange, totalPages],
  )

  const handleFlipStart = useCallback(() => {
    setIsFlipping(true)
    playFlipSound()
  }, [playFlipSound])

  const handleFlipEnd = useCallback(() => {
    setIsFlipping(false)
  }, [])

  const flipPrev = () => {
    flipBookRef.current?.pageFlip()?.flipPrev()
  }

  const flipNext = () => {
    flipBookRef.current?.pageFlip()?.flipNext()
  }

  const goToPage = (pageNum: number) => {
    flipBookRef.current?.pageFlip()?.flip(pageNum)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!book) return
      if (e.key === "ArrowLeft") flipPrev()
      if (e.key === "ArrowRight") flipNext()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [book])

  if (!book) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center"
        style={{ backgroundColor: styles.canvasBg }}
      >
        <div className="text-center p-8">
          <BookOpen
            className="w-24 h-24 mx-auto mb-6 opacity-30"
            style={{ color: theme === "light" ? "#000" : "#fff" }}
          />
          <h2 className="text-2xl font-semibold mb-3" style={{ color: theme === "light" ? "#1a1a1a" : "#e5e5e5" }}>
            No Book Selected
          </h2>
          <p className="mb-6 opacity-60" style={{ color: theme === "light" ? "#1a1a1a" : "#e5e5e5" }}>
            Upload a PDF to start reading
          </p>
          <Button onClick={onUploadClick} size="lg" className="gap-2">
            <Upload className="w-5 h-5" />
            Upload PDF
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col" style={{ backgroundColor: styles.canvasBg }}>
      {/* Top controls */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: theme === "light" ? "#f5f5f5" : "#141414",
          borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
        }}
      >
        <h3
          className="font-medium truncate max-w-[200px] md:max-w-md"
          style={{ color: theme === "light" ? "#1a1a1a" : "#e5e5e5" }}
        >
          {book.title}
        </h3>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute page flip sound" : "Enable page flip sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-12 text-center" style={{ color: theme === "light" ? "#1a1a1a" : "#e5e5e5" }}>
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} disabled={zoom >= 2}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Flipbook container with spine */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
        <div
          className="relative"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.2s ease",
          }}
        >
          <div
            className={`book-wrapper relative ${isFlipping ? "is-flipping" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Book spine - visible middle line */}
            <div
              className="book-spine absolute z-10"
              style={{
                width: "8px",
                height: `${dimensions.height}px`,
                background: styles.spineGradient,
                left: "50%",
                transform: "translateX(-50%)",
                boxShadow: "inset 0 0 4px rgba(0,0,0,0.4), 0 0 8px rgba(0,0,0,0.3)",
                borderRadius: "1px",
              }}
            />

            {/* @ts-ignore - react-pageflip types issue */}
            <HTMLFlipBook
              ref={flipBookRef}
              width={dimensions.width}
              height={dimensions.height}
              size="fixed"
              minWidth={280}
              maxWidth={600}
              minHeight={400}
              maxHeight={800}
              showCover={true}
              mobileScrollSupport={true}
              onFlip={handleFlip}
              onChangeState={handleFlipEnd}
              className="book-shadow"
              style={{}}
              startPage={0}
              drawShadow={true}
              flippingTime={800}
              usePortrait={false}
              startZIndex={0}
              autoSize={false}
              maxShadowOpacity={0.7}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={30}
              showPageCorners={true}
              disableFlipByClick={false}
              onChangeOrientation={() => {}}
              onInit={() => {}}
              onUpdate={() => {}}
            >
              {/* Front Cover */}
              <Cover title={book.title} theme={theme} type="front" />

              {/* PDF Pages - pass imageDataUrl correctly */}
              {book.pages.map((page) => (
                <Page
                  key={page.pageNumber}
                  pageNumber={page.pageNumber}
                  imageDataUrl={page.imageDataUrl}
                  theme={theme}
                  renderMode={renderMode}
                  totalPages={totalPages}
                />
              ))}

              {/* Back Cover */}
              <Cover title={book.title} theme={theme} type="back" />
            </HTMLFlipBook>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-4 px-4 py-3 border-t"
        style={{
          backgroundColor: theme === "light" ? "#f5f5f5" : "#141414",
          borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
        }}
      >
        <Button variant="outline" size="icon" onClick={flipPrev} disabled={currentPageDisplay <= 0}>
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 w-64">
          <Slider
            value={[currentPageDisplay]}
            min={0}
            max={totalPages + 1}
            step={1}
            onValueChange={(value) => goToPage(value[0])}
            className="flex-1"
          />
        </div>

        <span className="text-sm min-w-[80px] text-center" style={{ color: theme === "light" ? "#1a1a1a" : "#e5e5e5" }}>
          {Math.max(0, currentPageDisplay - 1)} / {totalPages}
        </span>

        <Button variant="outline" size="icon" onClick={flipNext} disabled={currentPageDisplay >= totalPages + 1}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <style jsx global>{`
        .book-shadow {
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.4), 
            0 0 20px rgba(0, 0, 0, 0.2),
            0 2px 10px rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          perspective: 2000px;
        }

        .stf__wrapper {
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4) !important;
          perspective: 2500px !important;
        }

        .stf__block {
          box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.1) !important;
        }

        /* Enhanced page depth and edge shadows */
        .stf__item {
          box-shadow: 
            inset 3px 0 15px rgba(0, 0, 0, 0.12),
            inset -3px 0 15px rgba(0, 0, 0, 0.12),
            inset 0 3px 10px rgba(0, 0, 0, 0.05),
            inset 0 -3px 10px rgba(0, 0, 0, 0.05) !important;
          transition: box-shadow 0.3s ease;
        }

        /* Page curl effect during flip */
        .stf__item.--flipping {
          box-shadow: 
            inset 8px 0 25px rgba(0, 0, 0, 0.25),
            inset -3px 0 15px rgba(0, 0, 0, 0.1),
            0 5px 20px rgba(0, 0, 0, 0.3) !important;
        }

        /* Left page styling - deeper shadow on inner edge */
        .stf__item--left {
          box-shadow: 
            inset -8px 0 20px rgba(0, 0, 0, 0.15),
            inset 3px 0 8px rgba(255, 255, 255, 0.05) !important;
          border-right: 1px solid rgba(0, 0, 0, 0.08);
        }

        /* Right page styling - deeper shadow on inner edge */
        .stf__item--right {
          box-shadow: 
            inset 8px 0 20px rgba(0, 0, 0, 0.15),
            inset -3px 0 8px rgba(255, 255, 255, 0.05) !important;
          border-left: 1px solid rgba(0, 0, 0, 0.08);
        }

        /* Enhanced flip animation */
        .stf__item.--active {
          z-index: 100 !important;
        }

        /* Page corner hover effect */
        .stf__item::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 40px;
          height: 40px;
          background: linear-gradient(
            135deg, 
            transparent 50%, 
            rgba(0, 0, 0, 0.03) 50%
          );
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .stf__item--right:hover::after {
          opacity: 1;
        }

        /* Paper texture overlay */
        .page-content {
          user-select: none;
          position: relative;
        }

        .page-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.015;
          pointer-events: none;
          mix-blend-mode: multiply;
        }

        /* Smooth page turn transitions */
        .stf__item {
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        /* Book wrapper animation during flip */
        .book-wrapper {
          transition: transform 0.1s ease;
        }

        .book-wrapper.is-flipping {
          transform: scale(1.002);
        }

        .book-spine {
          pointer-events: none;
          transition: box-shadow 0.3s ease;
        }

        .book-wrapper.is-flipping .book-spine {
          box-shadow: 
            inset 0 0 6px rgba(0,0,0,0.5), 
            0 0 12px rgba(0,0,0,0.4),
            0 0 20px rgba(0,0,0,0.2);
        }

        /* Soft ambient lighting effect on pages */
        .stf__item--left::before,
        .stf__item--right::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            to right,
            rgba(0, 0, 0, 0.02) 0%,
            transparent 10%,
            transparent 90%,
            rgba(0, 0, 0, 0.02) 100%
          );
          pointer-events: none;
        }

        /* Page lift shadow during flip */
        .stf__item.--flipping::before {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 10%;
          right: 10%;
          height: 20px;
          background: radial-gradient(
            ellipse at center,
            rgba(0, 0, 0, 0.2) 0%,
            transparent 70%
          );
          filter: blur(5px);
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
