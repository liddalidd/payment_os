'use client'

export default function FinanceCostingPage() {
    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">利润核算</h1>
            <p className="text-muted-foreground">基于进货加权平均成本，自动核算每笔订单的真实毛利。功能正在开发中...</p>
            <div className="p-20 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                </div>
                <p className="font-medium">成本核算引擎正在接入现有订单数据...</p>
            </div>
        </div>
    )
}
