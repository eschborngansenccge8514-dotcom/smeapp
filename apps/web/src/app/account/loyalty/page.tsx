import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ArrowLeft, History, Coins, ChevronRight, Zap, Calendar } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default async function CustomerLoyaltyPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/account/loyalty')

  // Fetch all loyalty balances for this user
  const { data: balances } = await supabase
    .from('loyalty_balances')
    .select(`
      *,
      store:stores(id, name, logo_url),
      tier:loyalty_tiers(*)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  // Fetch recent transactions
  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select(`
      *,
      store:stores(name)
    `)
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/account/orders" className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">My Rewards</h1>
      </div>

      {/* Balances Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
           <Coins size={16} className="text-amber-500" /> Points by Store
        </h2>
        
        <div className="grid grid-cols-1 gap-4">
          {(!balances || balances.length === 0) && (
             <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <Trophy size={48} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">No points yet!</p>
                <p className="text-xs text-gray-400">Order from your favorite stores to earn points.</p>
                <Link href="/search" className="inline-block mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100">
                   Explore Stores
                </Link>
             </div>
          )}
          
          {balances?.map((bal: any) => (
            <div key={bal.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm group hover:border-indigo-100 transition-all">
               <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-lg overflow-hidden border border-gray-100">
                        {bal.store?.logo_url ? <img src={bal.store.logo_url} className="w-full h-full object-cover" /> : '🏪'}
                     </div>
                     <div>
                        <h3 className="font-bold text-gray-900">{bal.store?.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                           {bal.tier ? (
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                                style={{ backgroundColor: bal.tier.color + '20', color: bal.tier.color }}
                              >
                                {bal.tier.name}
                              </span>
                           ) : (
                              <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 bg-gray-50 rounded-full uppercase">Basic Member</span>
                           )}
                           <span className="text-[10px] text-gray-400 font-medium">• {bal.current_points} pts</span>
                        </div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-xl font-black text-indigo-600 leading-none">
                        {bal.current_points}
                        <span className="text-[10px] ml-1 uppercase text-gray-400">pts</span>
                     </div>
                     <p className="text-[10px] text-gray-400 font-medium mt-1">Lifetime: {bal.lifetime_points}</p>
                  </div>
               </div>
               
               {/* Progress to next tier? (Future enhancement) */}
            </div>
          ))}
        </div>
      </section>

      {/* Transactions Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
           <History size={16} className="text-indigo-500" /> Recent History
        </h2>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
           {transactions?.map((tx: any, idx: number) => (
              <div key={tx.id} className={cn(
                 "p-4 flex items-center justify-between hover:bg-gray-50 transition-colors",
                 idx < transactions.length - 1 && "border-b border-gray-50"
              )}>
                 <div className="flex items-center gap-3">
                    <div className={cn(
                       "w-8 h-8 rounded-full flex items-center justify-center",
                       tx.type === 'earn' ? "bg-green-50 text-green-600" : 
                       tx.type === 'redeem' ? "bg-indigo-50 text-indigo-600" :
                       "bg-red-50 text-red-600"
                    )}>
                       {tx.type === 'earn' ? <Zap size={14} fill="currentColor" /> : 
                        tx.type === 'redeem' ? <Coins size={14} /> : 
                        <Calendar size={14} />}
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-900 leading-none">{tx.store?.name}</p>
                       <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(tx.occurred_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} • {tx.type === 'earn' ? 'Earned' : tx.type === 'redeem' ? 'Redeemed' : 'Expired'}
                       </p>
                    </div>
                 </div>
                 <div className={cn(
                    "font-bold text-sm",
                    tx.points > 0 ? "text-green-600" : "text-red-500"
                 )}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                 </div>
              </div>
           ))}
           
           {(!transactions || transactions.length === 0) && (
              <div className="text-center py-8 text-gray-400 text-sm">No recent transactions</div>
           )}
        </div>
      </section>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
