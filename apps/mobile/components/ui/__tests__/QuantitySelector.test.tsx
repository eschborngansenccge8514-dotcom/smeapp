import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { QuantitySelector } from '../QuantitySelector'

describe('QuantitySelector', () => {
  it('renders current value', () => {
    render(<QuantitySelector value={3} min={1} max={10} onChange={jest.fn()} />)
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('increments on + press', () => {
    const onChange = jest.fn()
    render(<QuantitySelector value={3} min={1} max={10} onChange={onChange} />)
    fireEvent.press(screen.getByTestId('qty-increment'))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('decrements on – press', () => {
    const onChange = jest.fn()
    render(<QuantitySelector value={3} min={1} max={10} onChange={onChange} />)
    fireEvent.press(screen.getByTestId('qty-decrement'))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
