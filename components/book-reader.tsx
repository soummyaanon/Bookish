"use client"

import type React from "react"

import { useRef, useState, useEffect, useCallback } from "react"
import type { BookData, ThemeMode, RenderMode } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Upload, BookOpen } from "lucide-react"

interface BookReaderProps {
  book: BookData | null
  onPageChange: (page: number) => void
  onUploadClick: () => void
  theme: ThemeMode
  renderMode: RenderMode
}

const getCanvasColors = (theme: ThemeMode, renderMode: RenderMode) => {
  const baseColors = {
    light: {
      canvasBg: "#e8e8e8",
      pageBg: "#ffffff",
      pageText: "#1a1a1a",
      spineShadow: "rgba(0, 0, 0, 0.15)",
      pageShadow: "rgba(0, 0, 0, 0.3)",
    },
    dark: {
      canvasBg: "#0a0a0a",
      pageBg: "#1a1a1a",
      pageText: "#e5e5e5",
      spineShadow: "rgba(0, 0, 0, 0.4)",
      pageShadow: "rgba(0, 0, 0, 0.5)",
    },
    red: {
      canvasBg: "#1a0f0f",
      pageBg: "#f5e6d3",
      pageText: "#2d1810",
      spineShadow: "rgba(50, 20, 10, 0.3)",
      pageShadow: "rgba(50, 20, 10, 0.4)",
    },
  }

  const colors = { ...baseColors[theme] }

  // Apply render mode adjustments
  if (renderMode === "high-contrast") {
    if (theme === "dark") {
      colors.pageBg = "#000000"
      colors.pageText = "#ffffff"
    } else {
      colors.pageBg = "#ffffff"
      colors.pageText = "#000000"
    }
  } else if (renderMode === "sepia") {
    colors.pageBg = "#f4ecd8"
    colors.pageText = "#5c4033"
  }

  return colors
}

export function BookReader({ book, onPageChange, onUploadClick, theme, renderMode }: BookReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadedImagesRef = useRef<Map<number, HTMLImageElement>>(new Map())
  const [zoom, setZoom] = useState(1)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipProgress, setFlipProgress] = useState(0)
  const [flipDirection, setFlipDirection] = useState<"left" | "right" | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragCurrentX, setDragCurrentX] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [nextPageIndex, setNextPageIndex] = useState(0)

  const currentPage = book?.currentPage ?? 0
  const totalPages = book?.pages.length ?? 0

  useEffect(() => {
    if (!book) {
      loadedImagesRef.current.clear()
      setImagesLoaded(false)
      return
    }

    setImagesLoaded(false)
    const imagesToLoad = book.pages.length
    let loadedCount = 0
    loadedImagesRef.current.clear()

    book.pages.forEach((page, index) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        loadedImagesRef.current.set(index, img)
        loadedCount++
        if (loadedCount === imagesToLoad) {
          setImagesLoaded(true)
        }
      }
      img.onerror = () => {
        loadedCount++
        if (loadedCount === imagesToLoad) {
          setImagesLoaded(true)
        }
      }
      img.src = page.imageDataUrl
    })
  }, [book])

  const drawBook = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !book) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const colors = getCanvasColors(theme, renderMode)

    const containerRect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = containerRect.width * dpr
    canvas.height = containerRect.height * dpr
    canvas.style.width = `${containerRect.width}px`
    canvas.style.height = `${containerRect.height}px`

    ctx.scale(dpr, dpr)

    const width = containerRect.width
    const height = containerRect.height

    ctx.fillStyle = colors.canvasBg
    ctx.fillRect(0, 0, width, height)

    // Calculate book dimensions
    const bookWidth = Math.min(width * 0.9, 900) * zoom
    const bookHeight = Math.min(height * 0.85, 650) * zoom
    const bookX = (width - bookWidth) / 2
    const bookY = (height - bookHeight) / 2
    const pageWidth = bookWidth / 2

    ctx.shadowColor = colors.pageShadow
    ctx.shadowBlur = 30
    ctx.shadowOffsetX = 4
    ctx.shadowOffsetY = 8

    ctx.fillStyle = colors.pageBg
    ctx.beginPath()
    ctx.roundRect(bookX, bookY, pageWidth, bookHeight, [8, 0, 0, 8])
    ctx.fill()

    ctx.beginPath()
    ctx.roundRect(bookX + pageWidth, bookY, pageWidth, bookHeight, [0, 8, 8, 0])
    ctx.fill()

    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0

    const spineGradient = ctx.createLinearGradient(bookX + pageWidth - 20, 0, bookX + pageWidth + 20, 0)
    spineGradient.addColorStop(0, "rgba(0, 0, 0, 0)")
    spineGradient.addColorStop(0.3, colors.spineShadow)
    spineGradient.addColorStop(0.5, colors.spineShadow.replace(")", ", 0.25)").replace("rgba", "rgba"))
    spineGradient.addColorStop(0.7, colors.spineShadow)
    spineGradient.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = spineGradient
    ctx.fillRect(bookX + pageWidth - 20, bookY, 40, bookHeight)

    const leftPageIndex = currentPage * 2
    const rightPageIndex = currentPage * 2 + 1
    const padding = 15

    // Draw left page content
    if (leftPageIndex < book.pages.length) {
      const img = loadedImagesRef.current.get(leftPageIndex)
      if (img) {
        drawPageImage(
          ctx,
          img,
          bookX + padding,
          bookY + padding,
          pageWidth - padding * 2,
          bookHeight - padding * 2,
          leftPageIndex + 1,
          totalPages,
          colors,
        )
      } else {
        drawLoadingPlaceholder(
          ctx,
          bookX + padding,
          bookY + padding,
          pageWidth - padding * 2,
          bookHeight - padding * 2,
          leftPageIndex + 1,
          colors,
        )
      }
    }

    // Draw right page content
    if (rightPageIndex < book.pages.length) {
      const img = loadedImagesRef.current.get(rightPageIndex)
      if (img) {
        drawPageImage(
          ctx,
          img,
          bookX + pageWidth + padding,
          bookY + padding,
          pageWidth - padding * 2,
          bookHeight - padding * 2,
          rightPageIndex + 1,
          totalPages,
          colors,
        )
      } else {
        drawLoadingPlaceholder(
          ctx,
          bookX + pageWidth + padding,
          bookY + padding,
          pageWidth - padding * 2,
          bookHeight - padding * 2,
          rightPageIndex + 1,
          colors,
        )
      }
    }

    if (isDragging && !isFlipping) {
      const dragDelta = dragCurrentX - dragStartX
      const maxDrag = 150
      const clampedDrag = Math.max(-maxDrag, Math.min(maxDrag, dragDelta))
      const dragProgress = Math.abs(clampedDrag) / maxDrag

      if (Math.abs(clampedDrag) > 10) {
        drawDragPreview(ctx, bookX, bookY, pageWidth, bookHeight, clampedDrag, dragProgress, padding, colors)
      }
    }

    if (isFlipping && flipDirection) {
      drawFlippingPage(ctx, bookX, bookY, pageWidth, bookHeight, flipProgress, flipDirection, padding, colors)
    }

    // Page edges with theme-aware color
    const edgeColor = theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"
    ctx.strokeStyle = edgeColor
    ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.moveTo(bookX + bookWidth - 2 + i * 0.5, bookY + 8)
      ctx.lineTo(bookX + bookWidth - 2 + i * 0.5, bookY + bookHeight - 8)
      ctx.stroke()
    }
  }, [
    book,
    currentPage,
    zoom,
    isFlipping,
    flipProgress,
    flipDirection,
    totalPages,
    imagesLoaded,
    theme,
    renderMode,
    isDragging,
    dragCurrentX,
    dragStartX,
  ])

  const drawDragPreview = (
    ctx: CanvasRenderingContext2D,
    bookX: number,
    bookY: number,
    pageWidth: number,
    bookHeight: number,
    dragDelta: number,
    progress: number,
    padding: number,
    colors: ReturnType<typeof getCanvasColors>,
  ) => {
    ctx.save()

    const isForward = dragDelta < 0
    const originX = bookX + pageWidth
    const curlAmount = progress * 0.3

    ctx.translate(originX, bookY)

    // Draw page curl shadow
    const shadowOpacity = progress * 0.2
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`
    if (isForward) {
      ctx.fillRect(-pageWidth * curlAmount, 0, pageWidth * curlAmount, bookHeight)
    } else {
      ctx.fillRect(0, 0, pageWidth * curlAmount, bookHeight)
    }

    // Draw curled page corner
    const curlX = isForward ? -pageWidth * curlAmount : pageWidth * curlAmount
    ctx.fillStyle = colors.pageBg
    ctx.shadowColor = colors.pageShadow
    ctx.shadowBlur = 10 * progress
    ctx.shadowOffsetX = isForward ? -3 : 3

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(curlX, 0)
    ctx.lineTo(curlX, bookHeight)
    ctx.lineTo(0, bookHeight)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }

  const drawPageImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
    pageNumber: number,
    total: number,
    colors: ReturnType<typeof getCanvasColors>,
  ) => {
    const contentHeight = maxHeight - 30
    const imgAspect = img.width / img.height
    const areaAspect = maxWidth / contentHeight

    let drawWidth: number
    let drawHeight: number

    if (imgAspect > areaAspect) {
      drawWidth = maxWidth
      drawHeight = maxWidth / imgAspect
    } else {
      drawHeight = contentHeight
      drawWidth = drawHeight * imgAspect
    }

    const drawX = x + (maxWidth - drawWidth) / 2
    const drawY = y + (contentHeight - drawHeight) / 2

    if (renderMode === "sepia") {
      ctx.filter = "sepia(30%)"
    } else if (renderMode === "high-contrast") {
      ctx.filter = "contrast(1.2)"
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
    ctx.filter = "none"

    // Subtle border
    ctx.strokeStyle = theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
    ctx.lineWidth = 1
    ctx.strokeRect(drawX, drawY, drawWidth, drawHeight)

    // Page number
    ctx.fillStyle = colors.pageText
    ctx.font = `${12 * zoom}px 'Geist', system-ui, sans-serif`
    ctx.textAlign = "center"
    ctx.globalAlpha = 0.6
    ctx.fillText(`${pageNumber}`, x + maxWidth / 2, y + maxHeight - 8)
    ctx.globalAlpha = 1
    ctx.textAlign = "left"
  }

  const drawLoadingPlaceholder = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    pageNumber: number,
    colors: ReturnType<typeof getCanvasColors>,
  ) => {
    ctx.fillStyle = theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"
    ctx.fillRect(x, y, width, height - 30)

    ctx.fillStyle = colors.pageText
    ctx.globalAlpha = 0.4
    ctx.font = "14px 'Geist', system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("Loading...", x + width / 2, y + height / 2)
    ctx.fillText(`Page ${pageNumber}`, x + width / 2, y + height - 8)
    ctx.globalAlpha = 1
    ctx.textAlign = "left"
  }

  const drawFlippingPage = (
    ctx: CanvasRenderingContext2D,
    bookX: number,
    bookY: number,
    pageWidth: number,
    bookHeight: number,
    progress: number,
    direction: "left" | "right",
    padding: number,
    colors: ReturnType<typeof getCanvasColors>,
  ) => {
    ctx.save()

    const flipAngle = progress * Math.PI
    const originX = bookX + pageWidth

    let frontPageIndex: number
    let backPageIndex: number

    if (direction === "right") {
      frontPageIndex = currentPage * 2 + 1
      backPageIndex = (currentPage + 1) * 2
    } else {
      frontPageIndex = (currentPage - 1) * 2 + 1
      backPageIndex = currentPage * 2
    }

    const showFront = progress < 0.5

    ctx.translate(originX, bookY)

    // Calculate realistic 3D transform
    const scaleX = Math.abs(Math.cos(flipAngle))
    const perspective = 1 + Math.sin(flipAngle) * 0.1

    // Shadow under flipping page
    const shadowIntensity = Math.sin(flipAngle) * 0.25
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowIntensity})`
    if (direction === "right") {
      ctx.fillRect(-pageWidth * 0.4, 5, pageWidth * 0.4, bookHeight - 10)
    } else {
      ctx.fillRect(0, 5, pageWidth * 0.4, bookHeight - 10)
    }

    // Transform for page flip
    if (direction === "right") {
      ctx.scale(showFront ? scaleX : -scaleX, perspective)
      ctx.translate(showFront ? 0 : -pageWidth, 0)
    } else {
      ctx.scale(showFront ? -scaleX : scaleX, perspective)
      ctx.translate(showFront ? -pageWidth : 0, 0)
    }

    // Page background with shadow
    ctx.fillStyle = colors.pageBg
    ctx.shadowColor = colors.pageShadow
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = direction === "right" ? -8 : 8
    ctx.shadowOffsetY = 4

    ctx.beginPath()
    ctx.roundRect(0, 0, pageWidth, bookHeight, direction === "right" ? [8, 0, 0, 8] : [0, 8, 8, 0])
    ctx.fill()
    ctx.shadowColor = "transparent"

    // Page content
    const pageIndexToDraw = showFront ? frontPageIndex : backPageIndex

    if (book && pageIndexToDraw >= 0 && pageIndexToDraw < book.pages.length) {
      const img = loadedImagesRef.current.get(pageIndexToDraw)
      if (img) {
        const contentHeight = bookHeight - padding * 2 - 30
        const contentWidth = pageWidth - padding * 2
        const imgAspect = img.width / img.height
        const areaAspect = contentWidth / contentHeight

        let drawWidth: number
        let drawHeight: number

        if (imgAspect > areaAspect) {
          drawWidth = contentWidth
          drawHeight = contentWidth / imgAspect
        } else {
          drawHeight = contentHeight
          drawWidth = drawHeight * imgAspect
        }

        const drawX = padding + (contentWidth - drawWidth) / 2
        const drawY = padding + (contentHeight - drawHeight) / 2

        if (renderMode === "sepia") {
          ctx.filter = "sepia(30%)"
        } else if (renderMode === "high-contrast") {
          ctx.filter = "contrast(1.2)"
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
        ctx.filter = "none"

        ctx.fillStyle = colors.pageText
        ctx.globalAlpha = 0.6
        ctx.font = `${12 * zoom}px 'Geist', system-ui, sans-serif`
        ctx.textAlign = "center"
        ctx.fillText(`${pageIndexToDraw + 1}`, pageWidth / 2, bookHeight - padding - 8)
        ctx.globalAlpha = 1
        ctx.textAlign = "left"
      }
    }

    // Page curl highlight effect
    const highlightGradient = ctx.createLinearGradient(0, 0, pageWidth * 0.3, 0)
    highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.15 * Math.sin(flipAngle)})`)
    highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.fillStyle = highlightGradient
    ctx.fillRect(0, 0, pageWidth * 0.3, bookHeight)

    ctx.restore()
  }

  const animateFlip = useCallback(
    (direction: "left" | "right") => {
      if (isFlipping) return

      const totalSpreads = Math.ceil(totalPages / 2)
      const targetPage =
        direction === "right" ? Math.min(currentPage + 1, totalSpreads - 1) : Math.max(currentPage - 1, 0)

      if (targetPage === currentPage) return

      setIsFlipping(true)
      setFlipDirection(direction)
      setFlipProgress(0)
      setNextPageIndex(targetPage)

      const startTime = performance.now()
      const duration = 500

      const animate = (time: number) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Smooth ease-in-out curve
        const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

        setFlipProgress(eased)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsFlipping(false)
          setFlipDirection(null)
          setFlipProgress(0)
          onPageChange(targetPage)
        }
      }

      requestAnimationFrame(animate)
    },
    [currentPage, totalPages, isFlipping, onPageChange],
  )

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!book || isFlipping) return
    setIsDragging(true)
    setDragStartX(e.clientX)
    setDragCurrentX(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !book || isFlipping) return
    setDragCurrentX(e.clientX)

    const dragDelta = e.clientX - dragStartX
    const threshold = 80

    if (Math.abs(dragDelta) > threshold) {
      setIsDragging(false)
      setDragCurrentX(dragStartX)
      if (dragDelta < 0) {
        animateFlip("right")
      } else {
        animateFlip("left")
      }
    }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    setDragCurrentX(dragStartX)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        animateFlip("right")
      } else if (e.key === "ArrowLeft") {
        animateFlip("left")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [animateFlip])

  useEffect(() => {
    drawBook()
  }, [drawBook])

  useEffect(() => {
    const handleResize = () => {
      drawBook()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [drawBook])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (!book) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 bg-background">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
          <BookOpen className="h-10 w-10 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">Welcome to PageFlip</h2>
          <p className="mt-2 text-muted-foreground">Upload a PDF to start reading</p>
        </div>
        <Button onClick={onUploadClick} size="lg" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload PDF
        </Button>
      </div>
    )
  }

  const spreadIndex = currentPage + 1
  const totalSpreads = Math.ceil(totalPages / 2)

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="truncate text-lg font-medium text-foreground max-w-[200px] md:max-w-none">{book.title}</h2>
          {!imagesLoaded && <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Spread {spreadIndex} / {totalSpreads}
          </span>
        </div>
      </header>

      <div
        ref={containerRef}
        className="relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas ref={canvasRef} className="h-full w-full touch-none" />

        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/90 backdrop-blur-sm hover:bg-secondary disabled:opacity-30 transition-all hover:scale-105"
          onClick={() => animateFlip("left")}
          disabled={currentPage === 0 || isFlipping}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/90 backdrop-blur-sm hover:bg-secondary disabled:opacity-30 transition-all hover:scale-105"
          onClick={() => animateFlip("right")}
          disabled={currentPage >= totalSpreads - 1 || isFlipping}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-card/80 backdrop-blur-sm border border-border px-4 py-2">
          <p className="text-xs text-muted-foreground">Drag left or right to flip pages</p>
        </div>
      </div>

      <footer className="border-t border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <span className="text-sm text-muted-foreground w-20">Page {currentPage * 2 + 1}</span>
            <Slider
              value={[currentPage]}
              min={0}
              max={Math.max(0, totalSpreads - 1)}
              step={1}
              onValueChange={([value]) => onPageChange(value)}
              className="flex-1"
              disabled={isFlipping}
            />
            <span className="text-sm text-muted-foreground w-20 text-right">of {totalPages}</span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              disabled={zoom >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
