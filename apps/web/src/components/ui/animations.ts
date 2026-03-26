import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
}

export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

export const cardVariant: Variants = {
  hidden:  { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.35, ease: 'easeOut' } },
}

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.35, ease: 'easeOut' } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1,    transition: { duration: 0.3, ease: 'backOut' } },
}

export const progressBar: Variants = {
  hidden:  { width: '0%' },
  visible: (pct: number) => ({ width: `${pct}%`, transition: { duration: 0.6, ease: 'easeInOut' } }),
}

// Hover/tap interactions (pass directly to motion components)
export const cardHover = {
  whileHover: { y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.10)', transition: { duration: 0.2 } },
  whileTap:   { scale: 0.98 },
}

export const buttonTap = {
  whileTap: { scale: 0.97 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 17 },
}
