'use client'

interface Props {
  primaryColor: string
  storePhone?: string | null
}

export function PharmacyConsultBanner({ primaryColor, storePhone }: Props) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08)`, border: `1px solid ${primaryColor}25` }}
    >
      {/* Avatar */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
        style={{ backgroundColor: `${primaryColor}20` }}
      >
        👨‍⚕️
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm">Talk to our Pharmacist</p>
        <p className="text-gray-500 text-xs mt-0.5 leading-snug">
          Not sure which medicine to choose? Our licensed pharmacist can advise you for free.
        </p>
        {storePhone && (
          <p className="text-xs text-gray-400 mt-1">📞 {storePhone}</p>
        )}
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {storePhone && (
          <a
            href={`tel:${storePhone}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            📞 Call
          </a>
        )}
        <a
          href={`https://wa.me/${storePhone?.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-500 text-white transition-all hover:bg-green-600"
        >
          💬 WhatsApp
        </a>
      </div>
    </div>
  )
}
