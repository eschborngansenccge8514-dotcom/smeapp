import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

// Inline SVG placeholder — no file dependency
const PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWkiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNkMWQ1ZGIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='

interface Props extends Omit<ImageProps, 'src' | 'fill' | 'width' | 'height'> {
  src: string | null | undefined
  fallback?: string
  aspectRatio?: '1/1' | '4/3' | '16/9' | '3/4'
  priority?: boolean
  width?: number
  height?: number
}

export default function OptimizedImage({
  src,
  alt,
  fallback = PLACEHOLDER,
  aspectRatio,
  priority = false,
  className,
  width,
  height,
  ...props
}: Props) {
  const [error, setError] = useState(false)
  const imageSrc = error || !src ? fallback : src
  const useFill = !width && !height

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {useFill ? (
        <Image
          {...props}
          src={imageSrc}
          alt={alt}
          fill
          priority={priority}
          placeholder="blur"
          blurDataURL={PLACEHOLDER}
          onError={() => setError(true)}
          className="object-cover duration-700 ease-in-out"
        />
      ) : (
        <Image
          {...props}
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          placeholder="blur"
          blurDataURL={PLACEHOLDER}
          onError={() => setError(true)}
          className="object-cover duration-700 ease-in-out"
        />
      )}
    </div>
  )
}
