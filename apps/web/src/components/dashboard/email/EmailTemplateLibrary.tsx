'use client'

const TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    icon: '👋',
    subject: "Welcome to our shop, {{name}}!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
        <h1 style="color: #333; font-size: 28px; font-weight: 800; margin-bottom: 24px;">Welcome to the family! 👋</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Hi {{name}}, we are so excited to have you with us! To celebrate your first visit, we have a special gift for you.</p>
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; border: 2px dashed #e2e8f0; text-align: center;">
          <p style="text-transform: uppercase; font-size: 12px; font-weight: 800; color: #94a3b8; margin: 0 0 10px 0;">Your discount code</p>
          <span style="font-size: 32px; font-weight: 900; color: #1e293b; letter-spacing: 2px;">WELCOME10</span>
        </div>
      </div>
    `
  },
  {
    id: 'sale',
    name: 'Flash Sale',
    icon: '🔥',
    subject: "Hurry, {{name}}! 40% OFF EVERYTHING! 🔥",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center; padding: 40px; background: #000; color: #fff; border-radius: 24px;">
        <p style="text-transform: uppercase; letter-spacing: 4px; font-weight: 900; color: #fbbf24; font-size: 14px; margin-bottom: 10px;">The biggest sale of the year</p>
        <h1 style="font-size: 64px; font-weight: 900; line-height: 0.9; margin: 0 0 40px 0; letter-spacing: -2px;">40% OFF SITEWIDE</h1>
        <a href="https://yourshop.com" style="display: inline-block; background: #fff; color: #000; padding: 20px 48px; border-radius: 99px; font-weight: 900; text-decoration: none; font-size: 18px; margin-bottom: 40px;">SHOP THE SALE NOW</a>
      </div>
    `
  },
  {
    id: 'abandoned',
    name: 'Abandoned Cart',
    icon: '🛒',
    subject: "You left something behind, {{name}}!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 20px; background: #fff; border: 1px solid #eee;">
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 20px;">Still thinking about it? 🤔</h2>
        <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Hi {{name}}, we noticed you left some items in your cart. They are waiting for you!</p>
        <div style="background: #f1f5f9; height: 1px; margin-bottom: 30px;"></div>
        <a href="https://yourshop.com/cart" style="display: block; width: 100%; text-align: center; background: #3b82f6; color: #fff; padding: 18px; border-radius: 12px; font-weight: 800; text-decoration: none;">CHECKOUT NOW</a>
      </div>
    `
  }
]

interface Props {
  onSelect: (template: typeof TEMPLATES[0]) => void
  primaryColor: string
}

export function EmailTemplateLibrary({ onSelect, primaryColor }: Props) {
  return (
    <div className="space-y-3 px-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Starting Point</h3>
      <div className="grid grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="group p-5 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 transition-all text-left shadow-sm hover:translate-y-[-2px] hover:shadow-md"
          >
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl mb-3 shadow-inner group-hover:scale-110 transition-transform">
              {t.icon}
            </div>
            <p className="text-sm font-bold text-gray-900 mb-0.5">{t.name}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Preview Subject</p>
          </button>
        ))}
      </div>
    </div>
  )
}
