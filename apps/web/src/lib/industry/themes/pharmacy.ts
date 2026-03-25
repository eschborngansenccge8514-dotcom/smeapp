import type { PharmacyCategory } from '../types'

export const PHARMACY_CATEGORIES: PharmacyCategory[] = [
  {
    name: 'Pain Relief',
    icon: '💊',
    subcategories: ['Paracetamol', 'Ibuprofen', 'Aspirin', 'Topical Pain Relief'],
  },
  {
    name: 'Cold & Flu',
    icon: '🤧',
    subcategories: ['Decongestants', 'Cough Syrup', 'Antihistamines', 'Throat Lozenges'],
  },
  {
    name: 'Vitamins & Supplements',
    icon: '🌿',
    subcategories: ['Vitamin C', 'Vitamin D', 'Multivitamins', 'Omega-3', 'Probiotics'],
  },
  {
    name: 'Digestive Health',
    icon: '🫃',
    subcategories: ['Antacids', 'Laxatives', 'Anti-Diarrhoea', 'Probiotics'],
  },
  {
    name: 'Wound Care',
    icon: '🩹',
    subcategories: ['Plasters', 'Antiseptics', 'Bandages', 'Wound Dressings'],
  },
  {
    name: 'Eye & Ear',
    icon: '👁️',
    subcategories: ['Eye Drops', 'Eye Wash', 'Ear Drops', 'Contact Lens Care'],
  },
  {
    name: 'Skin Care',
    icon: '🧴',
    subcategories: ['Moisturisers', 'Sunscreen', 'Acne Treatment', 'Antifungal'],
  },
  {
    name: 'Baby & Mother',
    icon: '🍼',
    subcategories: ['Baby Vitamins', 'Teething', 'Nappy Rash', 'Prenatal Vitamins'],
  },
  {
    name: 'Diabetes Care',
    icon: '🩸',
    subcategories: ['Blood Glucose Monitors', 'Test Strips', 'Lancets', 'Insulin Syringes'],
  },
  {
    name: 'Prescription (Rx)',
    icon: '📋',
    subcategories: ['Antibiotics', 'Blood Pressure', 'Cholesterol', 'Diabetes Medication'],
  },
]

export const RX_CONFIG: Record<string, {
  label: string
  shortLabel: string
  color: string
  bg: string
  border: string
  icon: string
  description: string
}> = {
  otc: {
    label: 'Over-the-Counter',
    shortLabel: 'OTC',
    color: '#065F46',
    bg: '#D1FAE5',
    border: '#6EE7B7',
    icon: '✅',
    description: 'Available without a prescription',
  },
  pharmacist_only: {
    label: 'Pharmacist Only',
    shortLabel: 'P',
    color: '#92400E',
    bg: '#FEF3C7',
    border: '#FCD34D',
    icon: '💬',
    description: 'Ask our pharmacist before purchase',
  },
  prescription: {
    label: 'Prescription Only',
    shortLabel: 'Rx',
    color: '#991B1B',
    bg: '#FEE2E2',
    border: '#FCA5A5',
    icon: '📋',
    description: 'Valid prescription required',
  },
  supplement: {
    label: 'Supplement',
    shortLabel: 'SUP',
    color: '#1E40AF',
    bg: '#DBEAFE',
    border: '#93C5FD',
    icon: '🌿',
    description: 'Dietary supplement',
  },
}

export const DOSAGE_FORM_ICONS: Record<string, string> = {
  tablet:   '💊',
  capsule:  '💊',
  syrup:    '🧴',
  cream:    '🧴',
  gel:      '🧴',
  ointment: '🧴',
  drops:    '💧',
  spray:    '💨',
  patch:    '🩹',
  injection:'💉',
  inhaler:  '🫁',
  powder:   '🫙',
  sachet:   '🫙',
  lozenge:  '🍬',
  default:  '💊',
}
