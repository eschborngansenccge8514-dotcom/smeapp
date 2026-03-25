import type { GroceryDepartment } from '../types'

export const GROCERY_DEPARTMENTS: GroceryDepartment[] = [
  { name: 'Fresh Produce',   icon: '🥦', subcategories: ['Vegetables', 'Fruits', 'Herbs & Spices'] },
  { name: 'Meat & Seafood',  icon: '🥩', subcategories: ['Beef', 'Chicken', 'Pork', 'Seafood', 'Eggs'] },
  { name: 'Dairy & Chilled', icon: '🥛', subcategories: ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Tofu'] },
  { name: 'Bakery',          icon: '🍞', subcategories: ['Bread', 'Pastries', 'Cakes', 'Biscuits'] },
  { name: 'Pantry',          icon: '🥫', subcategories: ['Rice & Grains', 'Noodles', 'Canned Goods', 'Oils', 'Sauces'] },
  { name: 'Frozen Foods',    icon: '🧊', subcategories: ['Frozen Meals', 'Ice Cream', 'Frozen Veg', 'Frozen Meat'] },
  { name: 'Beverages',       icon: '🧃', subcategories: ['Water', 'Juices', 'Soft Drinks', 'Coffee & Tea', 'Energy Drinks'] },
  { name: 'Snacks',          icon: '🍿', subcategories: ['Chips', 'Nuts', 'Chocolates', 'Sweets', 'Crackers'] },
  { name: 'Health & Baby',   icon: '🍼', subcategories: ['Baby Food', 'Baby Care', 'Vitamins', 'Health Drinks'] },
  { name: 'Household',       icon: '🧴', subcategories: ['Cleaning', 'Laundry', 'Toiletries', 'Paper Goods'] },
]

export const GROCERY_SORT_OPTIONS = [
  { value: 'default',     label: 'Recommended' },
  { value: 'price_asc',   label: 'Price: Low to High' },
  { value: 'price_desc',  label: 'Price: High to Low' },
  { value: 'name_asc',    label: 'A → Z' },
  { value: 'promo_first', label: 'Promotions First' },
]
