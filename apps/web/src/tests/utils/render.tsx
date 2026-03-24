import { render, type RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import React from 'react'

// Add providers here as they grow
function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Providers, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
