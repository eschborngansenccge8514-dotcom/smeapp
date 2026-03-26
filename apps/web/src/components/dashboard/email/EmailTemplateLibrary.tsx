'use client'

const TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome New Customer',
    icon: '👋',
    preview: 'Thanks for joining us — here\'s a special offer.',
    tags: ['Onboarding', 'Automated'],
    html: (storeName: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:sans-serif;background:#f9fafb;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
  .header{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 32px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:24px}
  .header p{color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px}
  .body{padding:32px}
  .cta{display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin:20px 0}
  .footer{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <h1>Welcome to ${storeName}! 🎉</h1>
    <p>We're so happy you're here, {{name}}</p>
  </div>
  <div class="body">
    <p style="color:#374151;font-size:15px;line-height:1.6">
      Hi <strong>{{name}}</strong>,<br><br>
      Thank you for creating an account with us. We're excited to have you as part of our community.
      Here's a little something to get you started:
    </p>
    <div style="background:#f5f3ff;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px">Your welcome discount</p>
      <p style="font-size:32px;font-weight:900;color:#6366f1;margin:0">10% OFF</p>
      <p style="font-size:12px;color:#9ca3af;margin:8px 0 0">Use code: WELCOME10</p>
    </div>
    <a href="#" class="cta">Start Shopping →</a>
    <p style="font-size:12px;color:#9ca3af;margin-top:24px">
      If you have any questions, just reply to this email — we're always happy to help.
    </p>
  </div>
  <div class="footer">
    © ${storeName} · <a href="{{unsubscribe}}" style="color:#9ca3af">Unsubscribe</a>
  </div>
</div></body></html>`,
  },
  {
    id: 'order_confirmed',
    name: 'Order Confirmation',
    icon: '🛒',
    preview: 'Your order has been placed successfully.',
    tags: ['Transactional'],
    html: (storeName: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:sans-serif;background:#f9fafb;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
  .header{background:#10b981;padding:32px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px}
  .body{padding:32px}
  .badge{display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#059669;padding:8px 16px;border-radius:24px;font-size:13px;font-weight:700}
  .footer{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <div style="font-size:36px">✅</div>
    <h1>Order Confirmed!</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0">We've received your order</p>
  </div>
  <div class="body">
    <p style="color:#374151;font-size:15px;line-height:1.6">Hi <strong>{{name}}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6">
      Great news! Your order from <strong>${storeName}</strong> has been confirmed and is being prepared.
    </p>
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #e5e7eb">
      <p style="font-size:12px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px">Order Number</p>
      <p style="font-size:18px;font-weight:700;color:#1f2937;margin:0">{{order_id}}</p>
    </div>
    <p style="font-size:13px;color:#6b7280;line-height:1.6">
      We'll send you another email with a tracking link as soon as your items ship.
    </p>
  </div>
  <div class="footer">
    © ${storeName} · <a href="{{unsubscribe}}" style="color:#9ca3af">Unsubscribe</a>
  </div>
</div></body></html>`,
  },
  {
    id: 'sale_launch',
    name: 'Flash Sale Announcement',
    icon: '🔥',
    preview: 'The sale you\'ve been waiting for is finally here.',
    tags: ['Promotional'],
    html: (storeName: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:sans-serif;background:#0f172a;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:24px;margin-top:20px;overflow:hidden}
  .hero{background:#0f172a;padding:48px 32px;text-align:center;color:#fff}
  .hero h1{font-size:48px;font-weight:900;margin:0;letter-spacing:-1px}
  .hero p{font-size:18px;color:#94a3b8;margin:12px 0 0}
  .body{padding:40px 32px;text-align:center}
  .cta{display:inline-block;background:#3b82f6;color:#fff;padding:18px 40px;border-radius:16px;text-decoration:none;font-weight:800;font-size:16px;margin:20px 0;box-shadow:0 10px 15px -3px rgba(59,130,246,0.3)}
  .footer{padding:32px;text-align:center;font-size:12px;color:#64748b}
</style></head>
<body><div class="wrapper">
  <div class="hero">
    <h1>40% OFF</h1>
    <p>Site-wide. No exclusions.</p>
  </div>
  <div class="body">
    <p style="color:#1e293b;font-size:18px;font-weight:600">The Big Sale is officially LIVE!</p>
    <p style="color:#64748b;font-size:15px;line-height:1.6;margin:16px 0 24px">
      Hi {{name}}, it's time to treat yourself. Use the button below to shop our biggest collection yet before sizes sell out.
    </p>
    <a href="#" class="cta">SHOP THE SALE →</a>
    <p style="color:#94a3b8;font-size:12px;margin-top:32px">Offers valid for a limited time only.</p>
  </div>
  <div class="footer">
    © ${storeName} · <a href="{{unsubscribe}}" style="color:#64748b">Unsubscribe from these emails</a>
  </div>
</div></body></html>`,
  }
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (html: string) => void
  primaryColor: string
  storeName: string
}

export function EmailTemplateLibrary({ isOpen, onClose, onSelect, primaryColor, storeName }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Choose a Template</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center font-black text-xl">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((t) => (
            <div 
              key={t.id} 
              className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-col hover:border-gray-300 hover:bg-white hover:shadow-xl transition-all group cursor-pointer"
              onClick={() => onSelect(t.html(storeName))}
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                {t.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{t.name}</h3>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{t.preview}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {t.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-white border border-gray-100 text-gray-400">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
