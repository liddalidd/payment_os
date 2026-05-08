'use client'

export default function FinanceAccountsPage() {
    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">欠款管理</h1>
            <p className="text-muted-foreground">管理应收账款（谁欠我的）与应付账款（我欠谁的）。功能正在开发中...</p>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-emerald-600">应收 (待回款)</h2>
                    <div className="p-12 border-2 border-dashed rounded-xl text-center text-muted-foreground">暂无记录</div>
                </div>
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-red-600">应付 (待还款)</h2>
                    <div className="p-12 border-2 border-dashed rounded-xl text-center text-muted-foreground">暂无记录</div>
                </div>
            </div>
        </div>
    )
}
