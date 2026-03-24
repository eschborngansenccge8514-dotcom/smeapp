import { http, HttpResponse } from 'msw'

export const handlers = [
  // Delivery quote
  http.post('/api/delivery/quote', () =>
    HttpResponse.json({
      lalamove:   { fee: 8.50, eta: '30-45 min', quoteId: 'q-123' },
      easyparcel: {
        options: [
          { service_id: 'ep-1', courier_name: 'Pos Laju', price: 6.30, delivery_time: '1-3 days' },
          { service_id: 'ep-2', courier_name: 'J&T Express', price: 5.50, delivery_time: '2-5 days' },
        ],
      },
    })
  ),

  // Create order
  http.post('/api/checkout/create-order', () =>
    HttpResponse.json({
      orderId: 'order-abc-123',
      billUrl: 'https://www.billplz-sandbox.com/bills/xyz',
      billId:  'xyz',
    })
  ),

  // Apply promo
  http.post('/api/promotions/apply', () =>
    HttpResponse.json({ valid: true, discountAmount: 5.00, promotionId: 'promo-1', message: '10% off applied' })
  ),

  // Billplz webhook (test only)
  http.post('/api/webhooks/billplz', () =>
    HttpResponse.json({ received: true })
  ),
]
