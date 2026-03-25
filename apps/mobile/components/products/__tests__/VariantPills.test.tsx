import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { VariantPills } from '../VariantPills'

const VARIANTS = [
  { id: 'v1', name: 'Small',  price: 3.50, stock_qty: 5, is_active: true, sort_order: 0 },
  { id: 'v2', name: 'Large',  price: 5.00, stock_qty: 0, is_active: true, sort_order: 1 },
  { id: 'v3', name: 'Medium', price: 4.00, stock_qty: 3, is_active: true, sort_order: 2 },
]

describe('VariantPills', () => {
  it('renders all variant names', () => {
    const onSelect = jest.fn()
    render(<VariantPills variants={VARIANTS} selected={VARIANTS[0]} onSelect={onSelect} basePrice={3.50} />)
    expect(screen.getByText('Small')).toBeTruthy()
    expect(screen.getByText('Large')).toBeTruthy()
    expect(screen.getByText('Medium')).toBeTruthy()
  })

  it('calls onSelect when active variant pressed', () => {
    const onSelect = jest.fn()
    render(<VariantPills variants={VARIANTS} selected={VARIANTS[0]} onSelect={onSelect} basePrice={3.50} />)
    fireEvent.press(screen.getByText('Medium'))
    expect(onSelect).toHaveBeenCalled()
  })
})
