'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

export default function Home() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthOrderCount: 0,
    lowStockCount: 0,
    totalCustomers: 0,
    revenueHistory: [] as any[]
  })
  const [loading, setLoading] = useState(true)
  const [daysRange, setDaysRange] = useState(7)
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)
      const { data } = await api.dashboard(daysRange)
      if (data) {
        setStats({
          todayRevenue: data.todayRevenue,
          monthOrderCount: data.monthOrderCount,
          lowStockCount: data.lowStockCount,
          totalCustomers: data.totalCustomers,
          revenueHistory: data.revenueHistory,
        })
      }
      setLoading(false)
    }

    fetchDashboardData()
  }, [daysRange])

  const statCards = [
    {
      title: '今日销售额',
      value: `¥ ${stats.todayRevenue.toFixed(2)}`,
      icon: TrendingUp,
      description: '较昨日 +12.5%', // 占位逻辑，以后可实现对比
      trend: 'up',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: '本月订单',
      value: stats.monthOrderCount.toString(),
      icon: ShoppingBag,
      description: '本月累计成交',
      trend: 'neutral',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: '库存预警',
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      description: '需要及时补货',
      trend: stats.lowStockCount > 0 ? 'down' : 'neutral',
      color: stats.lowStockCount > 0 ? 'text-amber-500' : 'text-slate-500',
      bg: stats.lowStockCount > 0 ? 'bg-amber-500/10' : 'bg-slate-500/10'
    },
    {
      title: '会员总数',
      value: stats.totalCustomers.toString(),
      icon: Users,
      description: '已注册客户',
      trend: 'up',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10'
    }
  ]

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">经营概览</h1>
        <p className="text-muted-foreground">实时监控您的店铺运营状态与营收数据。</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{loading ? '...' : card.value}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {card.trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                {card.trend === 'down' && <ArrowDownRight className="h-3 w-3 text-amber-500" />}
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="md:col-span-4 border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              营收趋势
              <span className="text-xs font-normal text-muted-foreground">(元)</span>
            </CardTitle>
            <div className="flex bg-muted p-1 rounded-lg gap-1">
              {[7, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDaysRange(d)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${daysRange === d ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {d}天
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pl-2 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueHistory}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickFormatter={(value) => `¥${value}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'var(--card)' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--primary)"
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity / Quick Actions Placeholder */}
        <Card className="md:col-span-3 border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <a href="/pos" className="group p-4 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all border border-primary/10 flex flex-col items-center gap-2">
                <div className="p-2 bg-primary/20 rounded-lg text-primary group-hover:scale-110 transition-transform">
                  <ShoppingBag size={20} />
                </div>
                <span className="text-sm font-medium">进入收银台</span>
              </a>
              <a href="/inventory/new" className="group p-4 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl transition-all border border-blue-500/10 flex flex-col items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                  <ArrowUpRight size={20} />
                </div>
                <span className="text-sm font-medium">新增商品</span>
              </a>
              <a href="/inventory" className="group p-4 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl transition-all border border-amber-500/10 flex flex-col items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500 group-hover:scale-110 transition-transform">
                  <AlertTriangle size={20} />
                </div>
                <span className="text-sm font-medium">库存检查</span>
              </a>
              <a href="/analytics" className="group p-4 bg-violet-500/5 hover:bg-violet-500/10 rounded-xl transition-all border border-violet-500/10 flex flex-col items-center gap-2">
                <div className="p-2 bg-violet-500/20 rounded-lg text-violet-500 group-hover:scale-110 transition-transform">
                  <TrendingUp size={20} />
                </div>
                <span className="text-sm font-medium">深度分析</span>
              </a>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-dashed border-muted flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">更多功能模块正在开发中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
