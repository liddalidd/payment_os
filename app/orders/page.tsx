'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Plus, X, Filter as FilterIcon, CalendarIcon, MoreHorizontal, Edit, Trash } from 'lucide-react'
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Label } from '@/components/ui/label'

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Edit State
    const [editOpen, setEditOpen] = useState(false)
    const [currentOrder, setCurrentOrder] = useState<any>(null)
    const [editStatus, setEditStatus] = useState('')

    // Multi-dimensional Filter State
    type FilterType = 'customer' | 'product' | 'date_range'
    interface Filter {
        id: string
        type: FilterType
        value: string
        displayValue: string
    }
    const [activeFilters, setActiveFilters] = useState<Filter[]>([])
    const [currentFilterType, setCurrentFilterType] = useState<FilterType>('customer')
    const [filterValue, setFilterValue] = useState('')
    const [statusFilterGlobal, setStatusFilterGlobal] = useState('all')

    // Default to Today
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    })

    useEffect(() => {
        const fetchOrders = async () => {
            const { data } = await api.orders.list()
            if (data) setOrders(data)
            setLoading(false)
        }
        fetchOrders()
    }, [])

    const addFilter = () => {
        if (currentFilterType === 'date_range') {
            if (!dateRange?.from) return
            const startStr = format(dateRange.from, 'yyyy-MM-dd')
            const endStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : startStr

            const newFilter: Filter = {
                id: Math.random().toString(),
                type: 'date_range',
                value: JSON.stringify({ start: startStr, end: endStr }),
                displayValue: `时间: ${startStr} 至 ${endStr}`
            }
            setActiveFilters([...activeFilters, newFilter])
            // Reset to Today
            setDateRange({ from: new Date(), to: new Date() })
        } else {
            if (!filterValue.trim()) return
            const newFilter: Filter = {
                id: Math.random().toString(),
                type: currentFilterType,
                value: filterValue,
                displayValue: `${currentFilterType === 'customer' ? '客户' : '商品'}: ${filterValue}`
            }
            setActiveFilters([...activeFilters, newFilter])
            setFilterValue('')
        }
    }

    const removeFilter = (id: string) => {
        setActiveFilters(activeFilters.filter(f => f.id !== id))
    }

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除该订单吗？此操作无法恢复。')) return

        const { error } = await api.orders.remove(id)
        if (error) {
            alert('删除失败: ' + error.message)
        } else {
            setOrders(orders.filter(o => o.id !== id))
        }
    }

    const handleEditOrder = (order: any) => {
        setCurrentOrder(order)
        setEditStatus(order.status)
        setEditOpen(true)
    }

    const saveOrderEdit = async () => {
        if (!currentOrder) return

        setLoading(true)
        const { error } = await api.orders.updateStatus(currentOrder.id, {
            status: editStatus,
            currentStatus: currentOrder.status,
        })

        if (error) {
            alert('操作失败: ' + error.message)
            setLoading(false)
            return
        }

        setOrders(orders.map(o => o.id === currentOrder.id ? { ...o, status: editStatus } : o))
        setEditOpen(false)
        alert('修改成功')
        setLoading(false)
    }

    const filteredOrders = orders.filter(order => {
        // Global Status Filter
        if (statusFilterGlobal !== 'all' && order.status !== statusFilterGlobal) return false

        if (activeFilters.length === 0) return true

        return activeFilters.every(filter => {
            if (filter.type === 'customer') {
                const customerName = order.customers?.name || '散客'
                return customerName.includes(filter.value)
            }
            if (filter.type === 'product') {
                const productNames = order.order_items?.map((item: any) => item.products?.name).join(' ') || ''
                return productNames.includes(filter.value)
            }
            if (filter.type === 'date_range') {
                const { start, end } = JSON.parse(filter.value)
                const orderDate = new Date(order.created_at)
                return isWithinInterval(orderDate, {
                    start: startOfDay(parseISO(start)),
                    end: endOfDay(parseISO(end))
                })
            }
            return true
        })
    })

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div className="p-4 space-y-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight">订单历史</h1>

            {/* Advanced Filter Bar */}
            <div className="bg-muted/40 p-4 rounded-lg space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex gap-2 bg-background p-1 rounded-xl border shadow-sm shrink-0">
                        <Select value={statusFilterGlobal} onValueChange={status => setStatusFilterGlobal(status)}>
                            <SelectTrigger className="w-[140px] border-none bg-transparent focus:ring-0">
                                <SelectValue placeholder="所有状态" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-xl">
                                <SelectItem value="all">所有状态</SelectItem>
                                <SelectItem value="completed">已完成</SelectItem>
                                <SelectItem value="refunded_all">退款并退货</SelectItem>
                                <SelectItem value="refunded_only">仅退款</SelectItem>
                                <SelectItem value="cancelled">已取消</SelectItem>
                                <SelectItem value="pending">待处理</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 w-full md:w-auto">
                        <Select value={currentFilterType} onValueChange={(v: any) => setCurrentFilterType(v)}>
                            <SelectTrigger className="w-[120px] bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="customer">按客户</SelectItem>
                                <SelectItem value="product">按商品</SelectItem>
                                <SelectItem value="date_range">按时间段</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 w-full md:w-auto">
                        {currentFilterType === 'date_range' ? (
                            <div className="grid gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-[300px] justify-start text-left font-normal bg-background",
                                                !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "yyyy-MM-dd")} -{" "}
                                                        {format(dateRange.to, "yyyy-MM-dd")}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "yyyy-MM-dd")
                                                )
                                            ) : (
                                                <span>选择日期范围</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ) : (
                            <Input
                                placeholder={`输入${currentFilterType === 'customer' ? '客户姓名' : '商品名称'}...`}
                                value={filterValue}
                                onChange={e => setFilterValue(e.target.value)}
                                className="bg-background"
                                onKeyDown={e => e.key === 'Enter' && addFilter()}
                            />
                        )}
                    </div>

                    <Button onClick={addFilter} className="w-full md:w-auto gap-2">
                        <Plus size={16} /> 添加条件
                    </Button>
                </div>

                {/* Active Filters */}
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {activeFilters.map(filter => (
                            <Badge key={filter.id} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-sm bg-primary/10 hover:bg-primary/20">
                                {filter.displayValue}
                                <button onClick={() => removeFilter(filter.id)} className="hover:bg-red-200 rounded-full p-0.5">
                                    <X size={14} />
                                </button>
                            </Badge>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => setActiveFilters([])} className="text-muted-foreground text-xs h-7">
                            清空筛选
                        </Button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {paginatedOrders.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        {activeFilters.length > 0 ? '没有符合条件的订单' : (loading ? '加载中...' : '暂无订单数据')}
                    </div>
                ) : (
                    <div className="border rounded-md bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>订单号</TableHead>
                                    <TableHead className="w-[140px]">时间</TableHead>
                                    <TableHead className="hidden md:table-cell">包含商品</TableHead>
                                    <TableHead>客户</TableHead>
                                    <TableHead className="text-right">金额</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {order.id.slice(0, 8)}...
                                        </TableCell>
                                        <TableCell className="font-medium whitespace-nowrap text-sm">
                                            {format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">
                                            {order.order_items?.map((i: any) => i.products?.name).join(', ') || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {order.customers?.name || '散客'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            ¥{order.total_amount}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "font-bold",
                                                    order.status === 'completed' && "bg-green-50 text-green-600 border-green-100",
                                                    order.status === 'refunded_all' && "bg-orange-50 text-orange-600 border-orange-100",
                                                    order.status === 'refunded_only' && "bg-amber-50 text-amber-600 border-amber-100",
                                                    order.status === 'cancelled' && "bg-zinc-100 text-zinc-500 border-zinc-200",
                                                    order.status === 'pending' && "bg-blue-50 text-blue-600 border-blue-100"
                                                )}
                                            >
                                                {order.status === 'completed' && '已完成'}
                                                {order.status === 'refunded_all' && '退款并退货'}
                                                {order.status === 'refunded_only' && '仅退款'}
                                                {order.status === 'cancelled' && '已取消'}
                                                {order.status === 'pending' && '待处理'}
                                                {(!['completed', 'refunded_all', 'refunded_only', 'cancelled', 'pending'].includes(order.status)) && order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 text-blue-500 mr-2">详情</Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl">
                                                        <DialogHeader>
                                                            <DialogTitle>订单详情</DialogTitle>
                                                        </DialogHeader>
                                                        {/* Detail View Content */}
                                                        <div className="space-y-6 pt-4">
                                                            <div className="flex flex-col space-y-2 text-sm bg-muted/50 p-4 rounded-lg">
                                                                <div className="flex justify-between border-b pb-2">
                                                                    <span className="text-muted-foreground">订单号</span>
                                                                    <span className="font-mono">{order.id}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b pb-2">
                                                                    <span className="text-muted-foreground">下单时间</span>
                                                                    <span>{format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b pb-2">
                                                                    <span className="text-muted-foreground">客户信息</span>
                                                                    <span>{order.customers?.name || '散客'}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">支付方式</span>
                                                                    <span>{order.payment_method}</span>
                                                                </div>
                                                            </div>

                                                            <div className="border rounded-2xl overflow-hidden shadow-sm">
                                                                <Table>
                                                                    <TableHeader className="bg-muted/50">
                                                                        <TableRow>
                                                                            <TableHead className="px-6">商品明细</TableHead>
                                                                            <TableHead className="text-right">成交价</TableHead>
                                                                            <TableHead className="text-center">数量</TableHead>
                                                                            <TableHead className="text-right px-6">成交金额</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {order.order_items?.map((item: any) => {
                                                                            const hasDiscount = item.original_price && item.original_price > item.price_at_sale;
                                                                            const itemDiscount = hasDiscount ? (item.original_price - item.price_at_sale) * item.quantity : 0;

                                                                            return (
                                                                                <TableRow key={item.id} className="hover:bg-transparent">
                                                                                    <TableCell className="px-6 py-4">
                                                                                        <div className="flex items-center gap-3">
                                                                                            {item.products?.image_url && (
                                                                                                <img src={item.products.image_url} className="w-10 h-10 rounded-lg bg-secondary object-cover shadow-sm border" />
                                                                                            )}
                                                                                            <div>
                                                                                                <div className="font-bold text-zinc-800">{item.products?.name}</div>
                                                                                                {hasDiscount && (
                                                                                                    <div className="text-[10px] text-muted-foreground line-through font-mono">标准价: ¥{item.original_price}</div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <div className="flex flex-col items-end">
                                                                                            <span className="font-bold text-zinc-900">¥{item.price_at_sale}</span>
                                                                                            {hasDiscount && (
                                                                                                <Badge variant="outline" className="text-[9px] text-red-500 border-red-200 bg-red-50 font-black px-1 py-0 h-4 mt-0.5">
                                                                                                    -¥{(item.original_price - item.price_at_sale).toFixed(2)}
                                                                                                </Badge>
                                                                                            )}
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-center font-bold text-zinc-600">x{item.quantity}</TableCell>
                                                                                    <TableCell className="text-right px-6 font-black text-zinc-900">¥{(item.price_at_sale * item.quantity).toFixed(2)}</TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-3 pt-2">
                                                                <div className="space-y-1.5 w-full max-w-[280px]">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-muted-foreground">商品原价总计</span>
                                                                        <span className="font-mono text-zinc-500">¥{(
                                                                            order.order_items?.reduce((sum: number, item: any) =>
                                                                                sum + (item.original_price || item.price_at_sale) * item.quantity, 0
                                                                            ) || 0
                                                                        ).toFixed(2)}</span>
                                                                    </div>

                                                                    {/* Item Level Discounts Total */}
                                                                    {(order.order_items?.reduce((sum: number, item: any) =>
                                                                        sum + (item.original_price ? (item.original_price - item.price_at_sale) * item.quantity : 0), 0) > 0) && (
                                                                            <div className="flex justify-between text-sm text-red-500">
                                                                                <span>商品活动减免</span>
                                                                                <span className="font-mono">-¥{(order.order_items.reduce((sum: number, item: any) =>
                                                                                    sum + (item.original_price ? (item.original_price - item.price_at_sale) * item.quantity : 0), 0)).toFixed(2)}</span>
                                                                            </div>
                                                                        )}

                                                                    {order.discount_amount > 0 && (
                                                                        <div className="flex justify-between text-sm text-red-500 font-bold">
                                                                            <span className="flex items-center gap-1">
                                                                                <Plus className="w-3 h-3 rotate-45" /> 整单改价优惠
                                                                            </span>
                                                                            <span className="font-mono">-¥{order.discount_amount.toFixed(2)}</span>
                                                                        </div>
                                                                    )}

                                                                    <div className="pt-2 border-t flex justify-between items-center group">
                                                                        <span className="font-bold text-lg text-zinc-800">最终实付金额</span>
                                                                        <span className="text-3xl font-black text-primary font-mono tracking-tighter">
                                                                            ¥{order.total_amount}
                                                                        </span>
                                                                    </div>

                                                                    {(order.discount_amount > 0 || order.order_items?.some((i: any) => i.original_price > i.price_at_sale)) && (
                                                                        <div className="bg-primary/5 p-2 rounded-lg text-center mt-2 group-hover:bg-primary/10 transition-colors">
                                                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                                                                共为您节省了 ¥{(
                                                                                    (order.order_items?.reduce((sum: number, item: any) =>
                                                                                        sum + (item.original_price ? (item.original_price - item.price_at_sale) * item.quantity : 0), 0) || 0) +
                                                                                    (order.discount_amount || 0)
                                                                                ).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditOrder(order)} className="cursor-pointer">
                                                            <Edit className="mr-2 h-4 w-4" /> 编辑订单
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(order.id)} className="text-red-600 cursor-pointer">
                                                            <Trash className="mr-2 h-4 w-4" /> 删除订单
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        isActive={currentPage === page}
                                        onClick={() => setCurrentPage(page)}
                                        className="cursor-pointer"
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>

            {/* Edit Order Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑订单状态</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>订单状态</Label>
                            <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-xl">
                                    <SelectItem value="completed">已完成</SelectItem>
                                    <SelectItem value="refunded_all">退款并退货 (返回金额+增加库存)</SelectItem>
                                    <SelectItem value="refunded_only">仅退款 (仅返回金额)</SelectItem>
                                    <SelectItem value="cancelled">已取消</SelectItem>
                                    <SelectItem value="pending">待支付</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={saveOrderEdit}
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? '提交中...' : '保存修改'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}
