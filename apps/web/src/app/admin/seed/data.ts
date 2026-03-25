
export const SEED_DATA = {
  '🍜 Food & Beverages': [
    {
      name: 'Signature Beef Noodle Soup',
      description: 'Our award-winning slow-cooked beef broth with tender brisket and handmade noodles.',
      price: 18.50,
      stock_qty: 100,
      image_urls: ['https://images.unsplash.com/photo-1582878826629-29b7ad1ccd63?auto=format&fit=crop&q=80&w=800'],
      is_halal: true,
      spice_level: 2,
    },
    {
      name: 'Golden Durian Mochi',
      description: 'Fresh Musang King durian cream wrapped in soft, chewy rice cake.',
      price: 12.00,
      stock_qty: 50,
      image_urls: ['https://images.unsplash.com/photo-1590005354167-6da97870c757?auto=format&fit=crop&q=80&w=800'],
      is_vegetarian: true,
      is_popular: true,
    }
  ],
  '🛒 Grocery & Market': [
    {
      name: 'Organic Bananas (Bunch)',
      description: 'Sweet and creamy organic bananas, perfect for snacks or baking.',
      price: 4.50,
      stock_qty: 200,
      image_urls: ['https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&q=80&w=800'],
      weight_value: 1,
      weight_unit: 'kg',
      is_organic: true,
      is_local: true,
    },
    {
      name: 'Premium Jasmine Rice (5kg)',
      description: 'High-quality, fragrant long-grain jasmine rice.',
      price: 32.00,
      stock_qty: 150,
      image_urls: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'],
      weight_value: 5,
      weight_unit: 'kg',
    }
  ],
  '💊 Health & Pharmacy': [
    {
      name: 'Vitamin C 1000mg Effervescent',
      description: 'Daily immune support with 30 orange-flavored tablets.',
      price: 25.00,
      stock_qty: 300,
      image_urls: ['https://images.unsplash.com/photo-1616671285411-e12984185af3?auto=format&fit=crop&q=80&w=800'],
      rx_status: 'otc',
      dosage_form: 'tablet',
    },
    {
      name: 'Soothing Aloe Vera Gel',
      description: '99% pure aloe vera gel for skin hydration and sunburn relief.',
      price: 15.00,
      stock_qty: 100,
      image_urls: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=800'],
      rx_status: 'otc',
    }
  ],
  '📱 Electronics': [
    {
      name: 'Quantum X-Pro Wireless Earbuds',
      description: 'Active noise cancelling with 30-hour battery life and spatial audio.',
      price: 299.00,
      stock_qty: 50,
      image_urls: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800'],
      specs: [
        { label: 'Battery Life', value: '30 hours' },
        { label: 'Bluetooth', value: 'v5.3' }
      ],
      is_new: true,
    },
    {
      name: '4K Ultra Slim Smart TV 55"',
      description: 'Breathtaking 4K resolution with HDR10+ and built-in streaming apps.',
      price: 1299.00,
      stock_qty: 20,
      image_urls: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800'],
      specs: [
        { label: 'Screen Size', value: '55 inch' },
        { label: 'Resolution', value: '4K UHD' }
      ],
    }
  ],
  '👗 Fashion & Apparel': [
    {
      name: 'Classic Linen Summer Dress',
      description: 'Breathable linen dress with a flattering A-line silhouette.',
      price: 85.00,
      stock_qty: 40,
      image_urls: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=800'],
      colours: ['White', 'Navy', 'Olive'],
      sizes: ['S', 'M', 'L', 'XL'],
      gender_target: 'female',
    },
    {
      name: 'Italian Leather Chelsea Boots',
      description: 'Handcrafted premium leather boots with durable rubber soles.',
      price: 210.00,
      stock_qty: 25,
      image_urls: ['https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=800'],
      colours: ['Black', 'Brown'],
      sizes: ['US 8', 'US 9', 'US 10', 'US 11'],
      gender_target: 'male',
    }
  ]
}
