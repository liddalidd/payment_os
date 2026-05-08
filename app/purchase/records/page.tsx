'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, CalendarIcon, Package, Truck, Receipt, Eye, BarChart3, TrendingUp, Users } from 'lucide-react'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function PurchaseRecordsPage() {
    const [records, setRecords] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: undefined,
        to: undefined,
    })

    useEffect(() => {
        fetchRecords()
    }, [])

    const fetchRecords = async () => {
        setLoading(true)
        const { data } = await api.purchaseOrders.list()
        if (data) setRecords(data)
        setLoading(false)
    }

    const handleStatusUpdate = async (record: any, newType: string, newPaymentStatus: string) => {
        const oldType = record.type || 'inbound'
        const oldPaymentStatus = record.payment_status || 'unpaid'

        if (oldType === newType && oldPaymentStatus === newPaymentStatus) return

        const { error } = await api.purchaseOrders.updateStatus(record.id, {
            type: newType as 'inbound' | 'outbound',
            payment_status: newPaymentStatus as 'paid' | 'unpaid',
        })
        if (error) {
            alert('更新失败: ' + error.message)
            return
        }
        alert('状态更新成功，库存与财务已同步')
        fetchRecords()
    }

    const filteredRecords = records.filter(record => {
        // Search Filter
        const matchesSearch = !searchQuery ||
            record.suppliers?.name?.includes(searchQuery) ||
            record.id.includes(searchQuery) ||
            record.purchase_order_items?.some((item: any) =>
                item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            )

        // Date Filter
        let matchesDate = true
        if (dateRange?.from) {
            const recordDate = parseISO(record.created_at)
            const start = startOfDay(dateRange.from)
            const end = endOfDay(dateRange.to || dateRange.from)
            matchesDate = isWithinInterval(recordDate, { start, end })
        }

        return matchesSearch && matchesDate
    })

    // Product Perspective Stats
    const productStats = (() => {
        if (!searchQuery || searchQuery.length < 2) return null

        let totalQty = 0
        let totalCost = 0
        const supplierMap: Record<string, { qty: number, cost: number }> = {}
        let foundProductName = ''

        filteredRecords.forEach(record => {
            record.purchase_order_items?.forEach((item: any) => {
                if (item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
                    if (!foundProductName) foundProductName = item.products.name
                    const qty = Number(item.quantity || 0)
                    const cost = Number(item.cost_price || 0) * qty

                    totalQty += qty
                    totalCost += cost

                    const sName = record.suppliers?.name || '未知供应商'
                    if (!supplierMap[sName]) supplierMap[sName] = { qty: 0, cost: 0 }
                    supplierMap[sName].qty += qty
                    supplierMap[sName].cost += cost
                }
            })
        })

        if (totalQty === 0) return null

        return {
            productName: foundProductName,
            totalQty,
            totalCost,
            avgPrice: totalCost / totalQty,
            suppliers: Object.entries(supplierMap)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.qty - a.qty)
        }
    })()

    return (
        <div className="p-4 space-y-6 max-w-6xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-zinc-900">进货历史记录</h1>
                    <p className="text-muted-foreground text-sm">查看以往的采购入库清单与成本明细</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        className="pl-10 h-11 bg-card border-none shadow-sm focus-visible:ring-primary/20 rounded-xl"
                        placeholder="搜索单号、供应商或商品名称..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="w-full md:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full md:w-[260px] h-11 justify-start text-left font-normal bg-card border-none shadow-sm rounded-xl",
                                    !dateRange?.from && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "yyyy-MM-dd")} - {format(dateRange.to, "yyyy-MM-dd")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "yyyy-MM-dd")
                                    )
                                ) : (
                                    <span>按时间段筛选</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl overflow-hidden" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={zhCN}
                            />
                            <div className="p-3 border-t bg-muted/50 flex justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="text-xs">
                                    清空筛选
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Product Insight Panel */}
            {productStats && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-none shadow-sm bg-primary text-white rounded-2xl overflow-hidden relative group">
                            <CardContent className="p-6">
                                <TrendingUp className="absolute right-4 top-4 h-12 w-12 text-white/10 group-hover:scale-110 transition-transform" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-primary-foreground/60 uppercase tracking-widest">进货加权均价</p>
                                    <h3 className="text-3xl font-black font-mono">¥{productStats.avgPrice.toFixed(2)}</h3>
                                    <p className="text-[10px] text-primary-foreground/40 font-bold italic truncate">PRODUCT: {productStats.productName}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden relative group">
                            <CardContent className="p-6">
                                <Package className="absolute right-4 top-4 h-12 w-12 text-zinc-100 group-hover:scale-110 transition-transform" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">累计进货总量</p>
                                    <h3 className="text-3xl font-black font-mono text-zinc-800">{productStats.totalQty}</h3>
                                    <p className="text-[10px] text-muted-foreground/40 font-bold uppercase">当前筛选周期内统计</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden relative group">
                            <CardContent className="p-6">
                                <Users className="absolute right-4 top-4 h-12 w-12 text-zinc-100 group-hover:scale-110 transition-transform" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">供应商渠道</p>
                                    <h3 className="text-3xl font-black font-mono text-zinc-800">{productStats.suppliers.length} 个</h3>
                                    <div className="flex gap-1 mt-1">
                                        {productStats.suppliers.slice(0, 2).map((s, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-[9px] py-0 px-1 bg-muted/50 text-muted-foreground border-none">
                                                {s.name}
                                            </Badge>
                                        ))}
                                        {productStats.suppliers.length > 2 && <span className="text-[9px] text-muted-foreground">...</span>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Supplier Distribution Table Mini */}
                    <div className="mt-4 bg-white/50 border border-dashed rounded-xl p-4">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <BarChart3 size={12} /> 供应商供货权重分布
                        </h4>
                        <div className="flex flex-wrap gap-6">
                            {productStats.suppliers.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-1 h-8 bg-primary rounded-full" />
                                    <div>
                                        <div className="text-xs font-bold text-zinc-700">{s.name}</div>
                                        <div className="text-[10px] font-mono text-muted-foreground">
                                            供货: {s.qty} 件 | 均价: ¥{(s.cost / s.qty).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-muted-foreground animate-pulse">加载进货数据中...</div>
                ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl text-muted-foreground">
                        暂无相关进货记录
                    </div>
                ) : (
                    <div className="border rounded-2xl bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[140px]">进货单号</TableHead>
                                    <TableHead className="w-[140px]">入库时间</TableHead>
                                    <TableHead>供应商</TableHead>
                                    <TableHead className="hidden md:table-cell">包含商品</TableHead>
                                    <TableHead className="text-right">总成本</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="w-[100px] text-center">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.map((record) => (
                                    <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {record.id.slice(0, 8)}...
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                                        </TableCell>
                                        <TableCell className="font-bold text-zinc-800">
                                            {record.suppliers?.name || '未知供应商'}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                                            {record.purchase_order_items?.map((i: any) => i.products?.name).join(', ') || '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-primary tabular-nums">
                                            ¥{(Number(record.total_cost) + Number(record.shipping_fee || 0) + Number(record.other_costs || 0)).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "font-bold whitespace-nowrap",
                                                        (record.type === 'outbound' || !record.type) ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-blue-50 text-blue-600 border-blue-100",
                                                        record.type === 'outbound' && "bg-rose-50 text-rose-600 border-rose-100"
                                                    )}
                                                >
                                                    {record.type === 'outbound' ? '出库' : '入库'}
                                                    {record.payment_status === 'paid' ? ' (已清)' : ' (待处理)'}
                                                </Badge>
                                                <div className="flex gap-1">
                                                    {record.payment_status === 'unpaid' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-[10px] bg-zinc-100 hover:bg-zinc-200"
                                                            onClick={() => handleStatusUpdate(record, record.type || 'inbound', 'paid')}
                                                        >
                                                            标记已付/已收
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[10px] bg-zinc-100 hover:bg-zinc-200"
                                                        onClick={() => handleStatusUpdate(record, record.type === 'outbound' ? 'inbound' : 'outbound', record.payment_status || 'unpaid')}
                                                    >
                                                        切换入/出库
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 text-blue-500 hover:bg-blue-50">
                                                        <Eye size={14} className="mr-1" /> 明细
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                                                    <div className="bg-primary p-8 text-white">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-2xl font-black text-white">进货清单明细</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div>
                                                                <div className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">供应商</div>
                                                                <div className="text-lg font-bold">{record.suppliers?.name}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">入库时间</div>
                                                                <div className="text-lg font-bold">{format(new Date(record.created_at), 'yyyy-MM-dd')}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">运费/杂费</div>
                                                                <div className="text-lg font-bold">¥{(Number(record.shipping_fee || 0) + Number(record.other_costs || 0)).toFixed(2)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">采购单号</div>
                                                                <div className="text-lg font-mono truncate">{record.id}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-6 space-y-6">
                                                        <div className="border rounded-2xl overflow-hidden bg-card">
                                                            <Table>
                                                                <TableHeader className="bg-muted/50">
                                                                    <TableRow>
                                                                        <TableHead className="px-6">商品信息</TableHead>
                                                                        <TableHead className="text-right">进价</TableHead>
                                                                        <TableHead className="text-center">入库数量</TableHead>
                                                                        <TableHead className="text-right px-6">总成本</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {record.purchase_order_items?.map((item: any) => (
                                                                        <TableRow key={item.id} className="hover:bg-transparent">
                                                                            <TableCell className="px-6 py-4">
                                                                                <div className="flex items-center gap-3">
                                                                                    {item.products?.image_url && (
                                                                                        <img src={item.products.image_url} className="w-10 h-10 rounded-lg bg-secondary object-cover shadow-sm" />
                                                                                    )}
                                                                                    <div>
                                                                                        <div className="font-bold text-zinc-900">{item.products?.name}</div>
                                                                                        <div className="text-[10px] text-muted-foreground font-bold uppercase">单位: {item.products?.unit || '件'}</div>
                                                                                    </div>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="text-right font-bold text-zinc-700">¥{item.cost_price}</TableCell>
                                                                            <TableCell className="text-center font-black text-zinc-600">x{item.quantity}</TableCell>
                                                                            <TableCell className="text-right px-6 font-black text-zinc-900">¥{(item.cost_price * item.quantity).toFixed(2)}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>

                                                        <div className="flex flex-col items-end space-y-2">
                                                            <div className="flex gap-10 text-sm text-muted-foreground">
                                                                <span>商品小计: ¥{Number(record.total_cost).toFixed(2)}</span>
                                                                <span>运费/杂费: ¥{(Number(record.shipping_fee || 0) + Number(record.other_costs || 0)).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-bold text-zinc-500">总投入成本:</span>
                                                                <span className="text-3xl font-black text-primary font-mono tabular-nums">
                                                                    ¥{(Number(record.total_cost) + Number(record.shipping_fee || 0) + Number(record.other_costs || 0)).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    )
}
