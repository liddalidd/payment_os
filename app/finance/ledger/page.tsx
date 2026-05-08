'use client'

export default function FinanceLedgerPage() {
    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">收支流水</h1>
            <p className="text-muted-foreground">此处将展示店铺的详细收支总账。功能正在开发中...</p>
            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-6 bg-card rounded-xl border border-dashed flex flex-col items-center justify-center min-h-[200px]">
                    <span className="text-sm text-muted-foreground">收入统计图表</span>
                </div>
                <div className="p-6 bg-card rounded-xl border border-dashed flex flex-col items-center justify-center min-h-[200px]">
                    <span className="text-sm text-muted-foreground">支出分类明细</span>
                </div>
                <div className="p-6 bg-card rounded-xl border border-dashed flex flex-col items-center justify-center min-h-[200px]">
                    <span className="text-sm text-muted-foreground">净利润趋势</span>
                </div>
            </div>
        </div>
    )
}
