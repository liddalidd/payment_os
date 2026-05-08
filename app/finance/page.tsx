'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    Scale,
    Calendar as CalendarIcon,
    TrendingUp,
    AlertCircle,
    ChevronRight,
    Filter
} from 'lucide-react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    subMonths,
    startOfDay,
    startOfYear,
    isWithinInterval,
    eachDayOfInterval,
    eachMonthOfInterval,
    subDays
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend
} from 'recharts'

type Granularity = 'day' | 'week' | 'month' | 'year' | 'all'

export default function FinanceDashboard() {
    const [stats, setStats] = useState({
        income: 0,
        expense: 0,
        ar: 0, // Accounts Receivable
        ap: 0  // Accounts Payable
    })
    const [granularity, setGranularity] = useState<Granularity>('month')
    const [recentTransactions, setRecentTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [chartData, setChartData] = useState<any[]>([])

    useEffect(() => {
        fetchFinanceData()
    }, [granularity])

    const fetchFinanceData = async () => {
        setLoading(true)
        try {
            // 1. Calculate Time Window for Cashflow (Income/Expense)
            let startDate: Date
            const now = new Date()

            if (granularity === 'day') startDate = startOfDay(now)
            else if (granularity === 'week') startDate = startOfWeek(now, { weekStartsOn: 1 })
            else if (granularity === 'month') startDate = startOfMonth(now)
            else if (granularity === 'year') startDate = startOfYear(now)
            else startDate = new Date(1970, 0, 1) // EPOCH for 'all'

            // 2. Fetch PERIOD transactions for Cash Flow
            const { data: periodTrans } = await api.transactions.list(
                granularity !== 'all' ? startDate.toISOString() : undefined,
            )

            // 3. Fetch ALL-TIME AR/AP specifically (to ensure balance is correct)
            const { data: allTrans } = await api.transactions.list()

            if (allTrans && periodTrans) {
                // A. Calculate AR/AP (All-time context)
                let balance = { ar: 0, ap: 0 }
                allTrans.forEach(t => {
                    const amount = Number(t.amount || 0)
                    if (t.ledger_type === 'ar') balance.ar += amount
                    else if (t.ledger_type === 'ap') balance.ap += amount
                })

                // B. Calculate Income/Expense (Period context)
                let periodStats = { income: 0, expense: 0 }
                periodTrans.forEach(t => {
                    const amount = Number(t.amount || 0)
                    if (t.ledger_type === 'cash') {
                        if (t.type === 'income') periodStats.income += amount
                        else periodStats.expense += amount
                    }
                })

                setStats({
                    income: periodStats.income,
                    expense: periodStats.expense,
                    ar: balance.ar,
                    ap: balance.ap
                })
                setRecentTransactions([...periodTrans].reverse().slice(0, 10))

                // C. Chart Aggregation (Use periodTrans)
                let aggregated: any[] = []
                const trans = periodTrans
                if (granularity === 'day') {
                    // Group by 4-hour slots for the day
                    for (let i = 0; i < 24; i += 4) {
                        const label = `${i}:00`
                        const income = trans.filter(t => t.type === 'income' && new Date(t.created_at).getHours() >= i && new Date(t.created_at).getHours() < i + 4).reduce((sum, t) => sum + Number(t.amount), 0)
                        const expense = trans.filter(t => t.type === 'expense' && new Date(t.created_at).getHours() >= i && new Date(t.created_at).getHours() < i + 4).reduce((sum, t) => sum + Number(t.amount), 0)
                        aggregated.push({ name: label, 收入: income, 支出: expense })
                    }
                } else if (granularity === 'week' || granularity === 'month') {
                    // Group by day
                    const days = eachDayOfInterval({ start: startDate, end: now })
                    aggregated = days.map(d => {
                        const dayStr = format(d, 'MM-dd')
                        const income = trans.filter(t => t.type === 'income' && format(new Date(t.created_at), 'MM-dd') === dayStr).reduce((sum, t) => sum + Number(t.amount), 0)
                        const expense = trans.filter(t => t.type === 'expense' && format(new Date(t.created_at), 'MM-dd') === dayStr).reduce((sum, t) => sum + Number(t.amount), 0)
                        return { name: dayStr, 收入: income, 支出: expense }
                    })
                } else if (granularity === 'year') {
                    // Group by month
                    const months = eachMonthOfInterval({ start: startDate, end: now })
                    aggregated = months.map(m => {
                        const monthStr = format(m, 'MMM')
                        const income = trans.filter(t => t.type === 'income' && format(new Date(t.created_at), 'MMM') === monthStr).reduce((sum, t) => sum + Number(t.amount), 0)
                        const expense = trans.filter(t => t.type === 'expense' && format(new Date(t.created_at), 'MMM') === monthStr).reduce((sum, t) => sum + Number(t.amount), 0)
                        return { name: monthStr, 收入: income, 支出: expense }
                    })
                } else if (granularity === 'all') {
                    // Group by month for 'all' time
                    const startDate_all = periodTrans.length > 0 ? new Date(periodTrans[0].created_at) : startOfYear(now)
                    const months = eachMonthOfInterval({ start: startDate_all, end: now })
                    aggregated = months.map(m => {
                        const monthStr = format(m, 'yy年MM月')
                        const income = periodTrans.filter(t => t.type === 'income' && format(new Date(t.created_at), 'yy-MM') === format(m, 'yy-MM')).reduce((sum, t) => sum + Number(t.amount), 0)
                        const expense = periodTrans.filter(t => t.type === 'expense' && format(new Date(t.created_at), 'yy-MM') === format(m, 'yy-MM')).reduce((sum, t) => sum + Number(t.amount), 0)
                        return { name: monthStr, 收入: income, 支出: expense }
                    }).filter(d => d.收入 > 0 || d.支出 > 0)
                }
                setChartData(aggregated)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-10 pb-28 md:pb-8 bg-muted/20 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900">财务经营看板</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">资金监控、收支平衡及债权债务实时汇总</p>
                </div>
                <div className="flex bg-zinc-200/50 backdrop-blur-md p-1 rounded-xl gap-1 w-full sm:w-auto">
                    {(['day', 'week', 'month', 'year', 'all'] as Granularity[]).map(g => (
                        <Button
                            key={g}
                            variant={granularity === g ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setGranularity(g)}
                            className={cn(
                                "h-8 px-4 rounded-lg text-xs font-bold transition-all",
                                granularity === g ? "bg-white shadow-sm" : "text-muted-foreground"
                            )}
                        >
                            {g === 'day' && '今日'}
                            {g === 'week' && '本周'}
                            {g === 'month' && '本月'}
                            {g === 'year' && '全年'}
                            {g === 'all' && '全部'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-emerald-500 text-white rounded-2xl sm:rounded-3xl overflow-hidden relative group">
                    <CardContent className="p-4 sm:p-6">
                        <ArrowUpCircle className="absolute right-2 top-2 sm:right-4 sm:top-4 h-8 w-8 sm:h-12 sm:w-12 text-white/20 group-hover:scale-110 transition-transform" />
                        <div className="space-y-1">
                            <p className="text-[10px] sm:text-xs font-black text-emerald-100 uppercase tracking-widest">
                                {granularity === 'day' && '今日'}
                                {granularity === 'week' && '本周'}
                                {granularity === 'month' && '本月'}
                                {granularity === 'year' && '全年'}
                                {granularity === 'all' && '累计'}
                                收入
                            </p>
                            <h3 className="text-xl sm:text-3xl font-black font-mono">¥{stats.income.toLocaleString()}</h3>
                            <div className="flex items-center gap-2 mt-1 sm:mt-2">
                                <Badge className="bg-white/20 text-white border-none text-[8px] sm:text-[10px] backdrop-blur-md">收入流入</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-rose-500 text-white rounded-2xl sm:rounded-3xl overflow-hidden relative group">
                    <CardContent className="p-4 sm:p-6">
                        <ArrowDownCircle className="absolute right-2 top-2 sm:right-4 sm:top-4 h-8 w-8 sm:h-12 sm:w-12 text-white/20 group-hover:scale-110 transition-transform" />
                        <div className="space-y-1">
                            <p className="text-[10px] sm:text-xs font-black text-rose-100 uppercase tracking-widest">
                                {granularity === 'day' && '今日'}
                                {granularity === 'week' && '本周'}
                                {granularity === 'month' && '本月'}
                                {granularity === 'year' && '全年'}
                                {granularity === 'all' && '累计'}
                                支出
                            </p>
                            <h3 className="text-xl sm:text-3xl font-black font-mono">¥{stats.expense.toLocaleString()}</h3>
                            <div className="flex items-center gap-2 mt-1 sm:mt-2">
                                <Badge className="bg-white/20 text-white border-none text-[8px] sm:text-[10px] backdrop-blur-md">支出流出</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-zinc-900 text-white rounded-2xl sm:rounded-3xl overflow-hidden relative group">
                    <CardContent className="p-4 sm:p-6">
                        <TrendingUp className="absolute right-2 top-2 sm:right-4 sm:top-4 h-8 w-8 sm:h-12 sm:w-12 text-white/10 group-hover:scale-110 transition-transform" />
                        <div className="space-y-1">
                            <p className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">
                                待收总额 (AR)
                            </p>
                            <h3 className="text-xl sm:text-3xl font-black font-mono">¥{stats.ar.toLocaleString()}</h3>
                            <div className="flex items-center gap-2 mt-1 sm:mt-2">
                                <Badge className="bg-white/10 text-zinc-300 border-none text-[8px] sm:text-[10px] backdrop-blur-md">应收账款</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white border border-zinc-100 text-zinc-900 rounded-2xl sm:rounded-3xl overflow-hidden relative group">
                    <CardContent className="p-4 sm:p-6">
                        <Scale className="absolute right-2 top-2 sm:right-4 sm:top-4 h-8 w-8 sm:h-12 sm:w-12 text-zinc-100 group-hover:scale-110 transition-transform" />
                        <div className="space-y-1">
                            <p className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">
                                待付总额 (AP)
                            </p>
                            <h3 className="text-xl sm:text-3xl font-black font-mono">¥{stats.ap.toLocaleString()}</h3>
                            <div className="flex items-center gap-2 mt-1 sm:mt-2">
                                <Badge className="bg-zinc-100 text-zinc-500 border-none text-[8px] sm:text-[10px]">应付账款</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Analysis Area Placeholder */}
                <Card className="lg:col-span-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 p-6">
                        <CardTitle className="text-lg font-black flex items-center gap-2 text-zinc-800">
                            趋势分析
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-7 bg-muted/30 rounded-full px-3">查看详情 <ChevronRight size={12} /></Button>
                    </CardHeader>
                    <CardContent className="h-[250px] sm:h-[300px] bg-white px-2 sm:px-6 pb-6">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
                                <Scale className="h-10 w-10 text-primary animate-bounce" />
                                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">正在同步实时数据线...</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                        tickFormatter={(val) => `¥${val}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                                    <Bar dataKey="收入" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="支出" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Ledger */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            最近交易
                        </h3>
                        <Button variant="link" className="text-[10px] font-black uppercase text-primary p-0 h-auto">全部 <ChevronRight size={10} /></Button>
                    </div>
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-10 animate-pulse text-[10px] font-black text-muted-foreground tracking-widest uppercase">正在同步流水...</div>
                        ) : recentTransactions.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-zinc-100 rounded-2xl text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">暂无数据</div>
                        ) : (
                            recentTransactions.map((t, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between border-l-4 border-l-primary group hover:bg-zinc-50 active:scale-[0.98] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            t.type === 'income' ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                                        )}>
                                            {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-zinc-800 tracking-tight">{t.category}</div>
                                            <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                                                {format(new Date(t.created_at), 'MM-dd HH:mm')}
                                                <span className="mx-1 opacity-20">|</span>
                                                <span className="tracking-widest">{t.ledger_type}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "text-sm font-black font-mono",
                                        t.type === 'income' ? "text-emerald-500" : "text-rose-500"
                                    )}>
                                        {t.type === 'income' ? '+' : '-'}¥{Number(t.amount).toFixed(2)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* AP / AR Alerts */}
            {(stats.ap > 10000 || stats.ar > 5000) && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
                    <div className="bg-zinc-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-zinc-700/50">
                        <AlertCircle className="text-amber-400" size={20} />
                        <div>
                            <div className="text-xs font-black uppercase tracking-tighter">异常经营提醒</div>
                            <div className="text-[10px] text-zinc-400 font-bold">
                                当前应付账款 (AP) 过高，建议及时清账以保持信誉。
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
