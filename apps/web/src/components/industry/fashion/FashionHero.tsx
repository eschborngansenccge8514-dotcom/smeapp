'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface HeroSlide {
  image_url: string
  headline: string
  subline?: string
  cta_label?: string
  cta_collection?: string
}

interface Props {
  store: any
  primaryColor: string
  accentColor: string
  onCollectionSelect: (col: string) => void
}

// Fallback editorial slides if store has no cover images
const DEFAULT_SLIDES: HeroSlide[] = [
  {
    image_url: '',
    headline: 'New Season Arrivals',
    subline: 'Fresh styles, made for you',
    cta_label: 'Shop New Arrivals',
    cta_collection: 'New Arrivals',
  },
]

export function FashionHero({ store, primaryColor, accentColor, onCollectionSelect }: Props) {
  const slides: HeroSlide[] = store.hero_slides?.length
    ? store.hero_slides
    : DEFAULT_SLIDES

  const [current, setCurrent] = useState(0)

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [slides.length])

  const slide = slides[current]

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/7', minHeight: 260 }}>
      {/* Background */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ background: `linear-gradient(135deg, ${primaryColor}CC, ${accentColor}99)` }}
      />
      {slide.image_url && (
        <Image
          src={slide.image_url}
          alt={slide.headline}
          fill
          className="object-cover object-center"
          priority
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 max-w-2xl">
        <div className="space-y-2 mb-5">
          {store.brand_collection_label && (
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-white/70">
              {store.brand_collection_label}
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow-md">
            {slide.headline}
          </h1>
          {slide.subline && (
            <p className="text-white/80 text-base md:text-lg">{slide.subline}</p>
          )}
        </div>

        {slide.cta_label && (
          <button
            onClick={() => slide.cta_collection && onCollectionSelect(slide.cta_collection)}
            className="self-start flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ backgroundColor: 'white', color: primaryColor }}
          >
            {slide.cta_label} →
          </button>
        )}
      </div>

      {/* Store badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        {store.logo_url && (
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/40 shadow">
            <Image src={store.logo_url} alt={store.name} width={36} height={36} className="object-cover" />
          </div>
        )}
        <span className="text-white font-bold text-sm drop-shadow">{store.name}</span>
      </div>

      {/* Slide dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
