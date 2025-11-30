"use client"

import { useRef, useCallback, useEffect } from "react"

interface PageFlipSoundOptions {
  enabled?: boolean
  volume?: number
}

export function usePageFlipSound(options: PageFlipSoundOptions = {}) {
  const { enabled = true, volume = 0.3 } = options
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  // Initialize audio context on first user interaction
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return null

    const ctx = new AudioContextClass()
    audioContextRef.current = ctx

    // Create master gain node for volume control
    const gainNode = ctx.createGain()
    gainNode.connect(ctx.destination)
    gainNode.gain.value = volume
    gainNodeRef.current = gainNode

    return ctx
  }, [volume])

  // Update volume when it changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [volume])

  // Generate realistic paper flip sound using synthesis
  const playFlipSound = useCallback(() => {
    if (!enabled) return

    const ctx = initAudioContext()
    if (!ctx || !gainNodeRef.current) return

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    const now = ctx.currentTime
    const duration = 0.35 // Total sound duration

    // Create multiple noise sources for realistic paper texture
    // 1. Main paper rustle (filtered noise)
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)

    // Generate brown noise (more natural sounding)
    let lastOut = 0
    for (let i = 0; i < noiseData.length; i++) {
      const white = Math.random() * 2 - 1
      noiseData[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = noiseData[i]
      noiseData[i] *= 3.5 // Normalize
    }

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer

    // Bandpass filter for paper-like frequency
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = "bandpass"
    bandpass.frequency.value = 2500
    bandpass.Q.value = 0.8

    // High-shelf to add paper crispness
    const highShelf = ctx.createBiquadFilter()
    highShelf.type = "highshelf"
    highShelf.frequency.value = 4000
    highShelf.gain.value = 3

    // Envelope for the flip motion
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(0.6, now + 0.03) // Quick attack
    envelope.gain.exponentialRampToValueAtTime(0.3, now + 0.1) // Initial drop
    envelope.gain.linearRampToValueAtTime(0.5, now + 0.18) // Slight rise as page lands
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration) // Fade out

    // Connect noise chain
    noiseSource.connect(bandpass)
    bandpass.connect(highShelf)
    highShelf.connect(envelope)
    envelope.connect(gainNodeRef.current)

    // 2. Soft thump when page lands
    const oscillator = ctx.createOscillator()
    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(80, now + 0.15)
    oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.25)

    const thumpEnvelope = ctx.createGain()
    thumpEnvelope.gain.setValueAtTime(0, now)
    thumpEnvelope.gain.setValueAtTime(0, now + 0.15) // Delay until page lands
    thumpEnvelope.gain.linearRampToValueAtTime(0.15, now + 0.18)
    thumpEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    oscillator.connect(thumpEnvelope)
    thumpEnvelope.connect(gainNodeRef.current)

    // 3. Additional paper texture layer
    const textureBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
    const textureData = textureBuffer.getChannelData(0)

    for (let i = 0; i < textureData.length; i++) {
      // Create sporadic crinkle sounds
      textureData[i] = Math.random() > 0.97 ? (Math.random() * 2 - 1) * 0.5 : 0
    }

    const textureSource = ctx.createBufferSource()
    textureSource.buffer = textureBuffer

    const textureFilter = ctx.createBiquadFilter()
    textureFilter.type = "highpass"
    textureFilter.frequency.value = 3000

    const textureGain = ctx.createGain()
    textureGain.gain.value = 0.2

    textureSource.connect(textureFilter)
    textureFilter.connect(textureGain)
    textureGain.connect(gainNodeRef.current)

    // Start all sounds
    noiseSource.start(now)
    noiseSource.stop(now + duration)

    oscillator.start(now)
    oscillator.stop(now + 0.35)

    textureSource.start(now + 0.02)
    textureSource.stop(now + 0.17)
  }, [enabled, initAudioContext])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }
    }
  }, [])

  return { playFlipSound }
}
