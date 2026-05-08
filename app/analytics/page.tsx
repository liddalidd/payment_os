'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DollarSign, ScanBarcode, ShoppingCart, TrendingUp } from 'lucide-react'

export default function AnalyticsPage() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalProfit: 0,
        totalOrders: 0,
        averageOrderValue: 0
    })
    const [dailyData, setDailyData] = useState<any[]>([])
    const [daysRange, setDaysRange] = useState(7)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - (daysRange - 1))
            startDate.setHours(0, 0, 0, 0)

            const { data } = await api.analytics(daysRange)
            if (!data) {
                setLoading(false)
                return
            }
            const { orders, items } = data

            // Calculate Metrics
            let rev = 0
            let cost = 0
            orders.forEach((o: any) => rev += Number(o.total_amount))

            items.forEach((i: any) => {
                if (i.cost_at_sale) {
                    cost += Number(i.cost_at_sale) * i.quantity
                }
            })

            const profit = rev - cost

            setStats({
                totalRevenue: rev,
                totalProfit: profit,
                totalOrders: orders.length,
                averageOrderValue: orders.length > 0 ? rev / orders.length : 0
            })

            // Prepare Chart Data (Group by Date, filling gaps)
            const historyMap = new Map()
            for (let i = 0; i < daysRange; i++) {
                const date = new Date(startDate)
                date.setDate(startDate.getDate() + i)
                const dateLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                historyMap.set(dateLabel, { date: dateLabel, revenue: 0, count: 0 })
            }

            orders.forEach((order: any) => {
                const dateLabel = new Date(order.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                if (historyMap.has(dateLabel)) {
                    const entry = historyMap.get(dateLabel)
                    entry.revenue += Number(order.total_amount)
                    entry.count += 1
                }
            })

            setDailyData(Array.from(historyMap.values()))
            setLoading(false)
        }

        fetchData()
    }, [daysRange])

    return (
        <div className="p-4 space-y-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight">经营数据分析</h1>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">总销售额</CardTitle>
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">¥{stats.totalRevenue.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">预估毛利</CardTitle>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">¥{stats.totalProfit.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">利润率: {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">订单数</CardTitle>
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">客单价</CardTitle>
                        <ScanBarcode className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">¥{stats.averageOrderValue.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Chart */}
            <Card className="col-span-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>近{daysRange}天销售趋势</CardTitle>
                    <div className="flex bg-muted p-1 rounded-lg gap-1 border">
                        {[7, 30].map(d => (
                            <button
                                key={d}
                                onClick={() => setDaysRange(d)}
                                className={`px-4 py-1.5 text-xs font-black rounded-md transition-all ${daysRange === d ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {d}天
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `¥${value}`}
                                />
                                <Tooltip
                                    formatter={(value: number | undefined) => [`¥${value ?? 0}`, '销售额']}
                                    labelStyle={{ color: '#333' }}
                                />
                                <Bar dataKey="revenue" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
