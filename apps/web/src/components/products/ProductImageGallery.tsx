'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

export function ProductImageGallery({ images, productName }: { images: string[]; productName: string }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  const allImages = images.length > 0 ? images : ['/placeholder-product.png']

  function prev() { setActive((i) => (i - 1 + allImages.length) % allImages.length) }
  function next() { setActive((i) => (i + 1) % allImages.length) }

  return (
    <>
      <div className="space-y-3">
        {/* Main image */}
        <div className="relative bg-gray-50 rounded-2xl overflow-hidden aspect-square group">
          <Image
            src={allImages[active]}
            alt={`${productName} image ${active + 1}`}
            fill
            className="object-contain p-4"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
          {allImages.length > 1 && (
            <>
              <button onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition-opacity opacity-0 group-hover:opacity-100">
                <ChevronLeft size={18} className="text-gray-700" />
              </button>
              <button onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition-opacity opacity-0 group-hover:opacity-100">
                <ChevronRight size={18} className="text-gray-700" />
              </button>
            </>
          )}
          <button
            onClick={() => setZoomed(true)}
            className="absolute bottom-3 right-3 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition-opacity opacity-0 group-hover:opacity-100"
          >
            <ZoomIn size={16} className="text-gray-700" />
          </button>
          {/* Image counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === active ? 'bg-indigo-600 w-4' : 'bg-gray-300 hover:bg-gray-400'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors
                  ${i === active ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Image src={img} alt="" width={64} height={64} className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom lightbox */}
      {zoomed && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}>
          <div className="relative max-w-4xl max-h-full w-full h-full">
            <Image
              src={allImages[active]}
              alt={productName}
              fill
              className="object-contain"
            />
          </div>
          <button onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
            ✕
          </button>
          {allImages.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
                <ChevronLeft size={22} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
