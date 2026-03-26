'use client'
import { useEffect } from 'react'

interface Props {
  primaryColor: string
  fontFamily:   string
  children:     React.ReactNode
}

export function TenantThemeProvider({ primaryColor, fontFamily, children }: Props) {
  useEffect(() => {
    // Inject CSS variables into :root for this store's brand
    const root = document.documentElement
    root.style.setProperty('--store-primary',    primaryColor)
    root.style.setProperty('--store-primary-10', `${primaryColor}1a`)
    root.style.setProperty('--store-primary-20', `${primaryColor}33`)

    // Convert hex → HSL for Tailwind-compatible usage
    const hsl = hexToHSL(primaryColor)
    root.style.setProperty('--store-h', String(hsl.h))
    root.style.setProperty('--store-s', `${hsl.s}%`)
    root.style.setProperty('--store-l', `${hsl.l}%`)

    return () => {
      root.style.removeProperty('--store-primary')
      root.style.removeProperty('--store-primary-10')
      root.style.removeProperty('--store-primary-20')
      root.style.removeProperty('--store-h')
      root.style.removeProperty('--store-s')
      root.style.removeProperty('--store-l')
    }
  }, [primaryColor])

  // Inject Google Font for this store
  useEffect(() => {
    const safeFont = ALLOWED_FONTS.includes(fontFamily) ? fontFamily : 'Inter'
    const link     = document.createElement('link')
    link.id        = 'tenant-font'
    link.rel       = 'stylesheet'
    link.href      = `https://fonts.googleapis.com/css2?family=${safeFont.replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap`
    
    // Check if tag already exists
    const existing = document.getElementById('tenant-font')
    if (existing) existing.remove()
    
    document.head.appendChild(link)
    document.documentElement.style.setProperty('--store-font', `'${safeFont}', sans-serif`)
    return () => { 
        // We don't necessarily want to remove the font on every unmount if 
        // there are multiple components, but for a layout wrapper it's fine.
    }
  }, [fontFamily])

  return <>{children}</>
}

const ALLOWED_FONTS = [
  'Inter', 'Poppins', 'Nunito', 'Raleway', 'Lato',
  'Montserrat', 'Playfair Display', 'DM Sans', 'Plus Jakarta Sans',
]

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Simple hex to HSL conversion
  let r = 0, g = 0, b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else {
    r = parseInt(hex.slice(1, 3), 16)
    g = parseInt(hex.slice(3, 5), 16)
    b = parseInt(hex.slice(5, 7), 16)
  }
  
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6;              break
      case b: h = ((r - g) / d + 4) / 6;              break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
