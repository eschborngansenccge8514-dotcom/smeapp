export const FASHION_CATEGORIES = [
  { name: 'New Arrivals',  icon: '✨', gender: null },
  { name: 'Tops',          icon: '👕', gender: null },
  { name: 'Bottoms',       icon: '👖', gender: null },
  { name: 'Dresses',       icon: '👗', gender: 'women' },
  { name: 'Outerwear',     icon: '🧥', gender: null },
  { name: 'Footwear',      icon: '👟', gender: null },
  { name: 'Accessories',   icon: '👜', gender: null },
  { name: 'Activewear',    icon: '🏃', gender: null },
  { name: 'Modest Wear',   icon: '🧕', gender: 'women' },
  { name: 'Formal',        icon: '👔', gender: null },
  { name: 'Loungewear',    icon: '🩴', gender: null },
  { name: 'Kids',          icon: '🧒', gender: 'kids' },
]

export const FASHION_SIZE_GUIDE: Record<string, {
  columns: string[]
  rows: { size: string; measurements: string[] }[]
  note?: string
}> = {
  tops: {
    columns: ['Size', 'Chest (cm)', 'Shoulder (cm)', 'Length (cm)'],
    rows: [
      { size: 'XS', measurements: ['80–84', '38–39', '64–66'] },
      { size: 'S',  measurements: ['84–88', '39–40', '66–68'] },
      { size: 'M',  measurements: ['88–92', '40–41', '68–70'] },
      { size: 'L',  measurements: ['92–96', '41–42', '70–72'] },
      { size: 'XL', measurements: ['96–102','43–44', '72–74'] },
      { size: 'XXL',measurements: ['102–108','45–46','74–76'] },
    ],
    note: 'Measurements are body measurements in cm. Add 2–4cm ease.',
  },
  bottoms: {
    columns: ['Size', 'Waist (cm)', 'Hip (cm)', 'Inseam (cm)'],
    rows: [
      { size: 'XS', measurements: ['62–66', '86–90',  '73'] },
      { size: 'S',  measurements: ['66–70', '90–94',  '74'] },
      { size: 'M',  measurements: ['70–74', '94–98',  '75'] },
      { size: 'L',  measurements: ['74–78', '98–102', '76'] },
      { size: 'XL', measurements: ['78–84', '102–108','76'] },
    ],
    note: 'Refer to waist measurement. Size up if between sizes.',
  },
  footwear: {
    columns: ['EU', 'US (M)', 'US (F)', 'UK', 'CM'],
    rows: [
      { size: '36', measurements: ['4', '5.5', '3.5', '23'] },
      { size: '37', measurements: ['4.5', '6', '4', '23.5'] },
      { size: '38', measurements: ['5', '6.5', '4.5', '24'] },
      { size: '39', measurements: ['6', '7.5', '5.5', '24.5'] },
      { size: '40', measurements: ['7', '8', '6', '25'] },
      { size: '41', measurements: ['7.5', '9', '7', '26'] },
      { size: '42', measurements: ['8', '9.5', '7.5', '26.5'] },
      { size: '43', measurements: ['9', '10', '8.5', '27.5'] },
      { size: '44', measurements: ['10', '11', '9.5', '28'] },
    ],
  },
}

export const FASHION_FILTER_OPTIONS = {
  gender: [
    { value: 'all',    label: 'All' },
    { value: 'women',  label: '♀ Women' },
    { value: 'men',    label: '♂ Men' },
    { value: 'unisex', label: '⚥ Unisex' },
    { value: 'kids',   label: '🧒 Kids' },
  ],
  sort: [
    { value: 'default',     label: 'Recommended' },
    { value: 'new_first',   label: 'New Arrivals' },
    { value: 'price_asc',   label: 'Price: Low to High' },
    { value: 'price_desc',  label: 'Price: High to Low' },
    { value: 'bestseller',  label: 'Bestsellers' },
    { value: 'sale_first',  label: 'On Sale' },
  ],
}
