import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

interface Props extends Omit<ImageProps, 'src'> {
  src: string | null | undefined
  fallback?: string
  aspectRatio?: '1/1' | '4/3' | '16/9' | '3/4'
  priority?: boolean
}

// Pre-generated blur placeholder (1×1 pixel, AVIF)
const BLUR_DATA_URL =
  'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABsAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg=='

export default function OptimizedImage({
  src,
  alt,
  fallback = '/placeholder-image.jpg',
  aspectRatio,
  priority = false,
  className,
  ...props
}: Props) {
  const [error, setError] = useState(false)
  const imageSrc = error || !src ? fallback : src

  return (
    <div
      className={`relative overflow-hidden bg-muted ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <Image
        {...props}
        src={imageSrc}
        alt={alt}
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        onLoad={() => {}} // Optional: handle loaded state
        onError={() => setError(true)}
        className={`object-cover duration-700 ease-in-out ${
          !imageSrc ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'
        }`}
      />
    </div>
  )
}
