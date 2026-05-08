'use client'

import { useState, useEffect } from 'react'
import { Search, ShoppingCart, Trash2, CreditCard, ScanLine, User, Plus, CheckCircle2, ArrowLeft, Loader2, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Product {
    id: string
    name: string
    retail_price: number
    cost_price: number
    unit: string | null
    image_url: string | null
    barcode: string
    stock_quantity: number
}

interface CartItem extends Product {
    cartQty: number
    salePrice: number // 优惠后的单价 (Discounted sale price)
}

export default function PosPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
    const [customerSearchQuery, setCustomerSearchQuery] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(false)
    const [newCustomerOpen, setNewCustomerOpen] = useState(false)
    const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' })
    const [customerLoading, setCustomerLoading] = useState(false)
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false)
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)

    // Payment Dialog States
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [checkoutStage, setCheckoutStage] = useState<'review' | 'payment'>('review')
    const [receivedAmount, setReceivedAmount] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState('wechat')
    const [miscDiscount, setMiscDiscount] = useState<number>(0)

    // Fetch products and customers
    const fetchCustomers = async () => {
        const { data } = await api.customers.list()
        if (data) setCustomers(data.slice().sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'zh-CN')))
    }
    useEffect(() => {
        const fetchData = async () => {
            const { data: productsData } = await api.products.list()
            if (productsData) setProducts(productsData)
            fetchCustomers()
        }
        fetchData()
    }, [])

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault()
        setCustomerLoading(true)
        const { data, error } = await api.customers.create(newCustomerData)
        setCustomerLoading(false)
        if (error || !data) {
            alert('添加失败: ' + (error?.message || ''))
        } else {
            setNewCustomerOpen(false)
            setNewCustomerData({ name: '', phone: '' })
            await fetchCustomers()
            setSelectedCustomerId(data.id) // Auto select
        }
    }

    // Filter products
    const filteredProducts = products.filter(p =>
        p.name.includes(searchQuery) ||
        (p.barcode && p.barcode.includes(searchQuery))
    )

    // Filter customers for dropdown
    const filteredCustomers = customers.filter(c =>
        c.name.includes(customerSearchQuery) ||
        (c.phone && c.phone.includes(customerSearchQuery))
    )

    // Cart Logic
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === product.id)
            if (existing) {
                return prev.map(p => p.id === product.id ? { ...p, cartQty: Number((p.cartQty + 1).toFixed(2)) } : p)
            }
            return [...prev, { ...product, cartQty: 1, salePrice: product.retail_price }]
        })
    }

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(p => p.id !== id))
    }

    const updateQty = (id: string, value: number) => {
        const item = cart.find(i => i.id === id)
        if (item && value > item.stock_quantity) {
            alert(`数量不能超过库存 (最大: ${item.stock_quantity})`)
            return
        }
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = Math.max(0.01, value)
                return { ...p, cartQty: Number(newQty.toFixed(2)) }
            }
            return p
        }))
    }

    const updateSalePrice = (id: string, value: number) => {
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, salePrice: Math.max(0, value) }
            }
            return p
        }))
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.salePrice * item.cartQty), 0)

    // Sync receivedAmount with (cartTotal - miscDiscount) during review stage
    useEffect(() => {
        if (checkoutOpen && checkoutStage === 'review') {
            const finalExpected = Math.max(0, cartTotal - miscDiscount)
            setReceivedAmount(Number(finalExpected.toFixed(2)))
        }
    }, [cartTotal, miscDiscount, checkoutOpen, checkoutStage])

    // Discount Calculation
    const discountAmount = checkoutOpen ? Math.max(0, cartTotal - (receivedAmount || cartTotal)) : 0
    const finalReceived = receivedAmount || cartTotal

    const openCheckout = () => {
        if (cart.length === 0) return
        setCheckoutStage('review')
        setReceivedAmount(Number(cartTotal.toFixed(2)))
        setCheckoutOpen(true)
    }

    const handleConfirmPayment = async () => {
        setLoading(true)
        // Double check stock before final commit
        for (const item of cart) {
            if (item.stock_quantity < item.cartQty) {
                alert(`商品 "${item.name}" 库存不足！(剩余: ${item.stock_quantity}, 尝试售出: ${item.cartQty})`)
                setLoading(false)
                return
            }
        }

        const { error } = await api.orders.create({
            customer_id: selectedCustomerId,
            payment_method: paymentMethod,
            total_amount: finalReceived,
            discount_amount: discountAmount > 0 ? discountAmount : 0,
            type: 'retail',
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.cartQty,
                price_at_sale: item.salePrice,
                original_price: item.retail_price,
                cost_at_sale: item.cost_price || 0,
            })),
        })

        if (error) {
            alert('结算失败: ' + error.message)
            setLoading(false)
            return
        }

        // Reset
        setCart([])
        setSelectedCustomerId(null)
        setCheckoutOpen(false)
        alert('收款成功！')

        // Refresh products
        const { data } = await api.products.list()
        if (data) setProducts(data)

        setLoading(false)
    }

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-2rem)] gap-0 md:gap-4 p-0 md:p-4 overflow-hidden bg-[#F5F5F7] text-zinc-900 relative">
            {/* Left: Product Grid */}
            <div className="flex-1 flex flex-col gap-3 md:gap-4 p-4 md:p-0 overflow-hidden relative">
                {/* Search Header - Sticky on mobile */}
                <div className="sticky top-0 md:relative z-20 flex gap-2 bg-white/70 backdrop-blur-xl p-2 md:p-3 rounded-xl md:rounded-3xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                        <Input
                            className="pl-10 h-11 text-lg border-none bg-zinc-100/50 focus-visible:ring-0 rounded-xl sm:rounded-2xl"
                            placeholder="搜索商品..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <Button variant="secondary" size="icon" className="h-11 w-11 rounded-xl sm:rounded-2xl bg-zinc-100 hover:bg-zinc-200 border-none transition-all"><ScanLine size={20} className="text-zinc-600" /></Button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto pr-0 md:pr-2 custom-scrollbar pb-24 md:pb-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                        {filteredProducts.map(product => (
                            <Card
                                key={product.id}
                                className="cursor-pointer border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all active:scale-[0.97] overflow-hidden group rounded-2xl sm:rounded-3xl bg-white"
                                onClick={() => addToCart(product)}
                            >
                                <div className="aspect-square bg-zinc-50 relative">
                                    {product.image_url ? (
                                        <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-300 italic text-[10px] uppercase tracking-widest font-black">商品图片</div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm backdrop-blur-md",
                                            product.stock_quantity <= 5 ? "bg-rose-500 text-white" : "bg-white/90 text-zinc-500"
                                        )}>
                                            库存: {product.stock_quantity}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 bg-white">
                                    <h3 className="font-bold truncate text-xs sm:text-sm leading-tight text-zinc-800">{product.name}</h3>
                                    <div className="flex justify-between items-center mt-1.5 sm:mt-2">
                                        <div className="text-zinc-900 font-black text-lg font-mono">¥{product.retail_price}</div>
                                        <div className="w-6 h-6 rounded-full bg-zinc-950 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                            <Plus size={14} />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Cart Container (Desktop & Mobile Overlay) */}
            <div className={cn(
                "fixed inset-0 z-50 bg-background md:relative md:inset-auto md:z-0 md:flex md:w-[400px] flex-col bg-card border-l md:border md:rounded-2xl shadow-xl h-full overflow-hidden transition-transform duration-300",
                isMobileCartOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"
            )}>
                {/* Mobile Cart Header Close */}
                <div className="md:hidden flex items-center p-4 border-b bg-muted/5">
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileCartOpen(false)}>
                        <ArrowLeft size={20} />
                    </Button>
                    <h2 className="ml-2 font-bold">购物车明细</h2>
                </div>

                {/* Cart Header */}
                <div className="p-5 border-b space-y-4 shrink-0 bg-muted/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <ShoppingCart size={20} />
                            </div>
                            <h2 className="font-extrabold text-lg tracking-tight">结算清单</h2>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground hover:bg-red-50 hover:text-red-500 rounded-lg">
                            <Trash2 size={16} className="mr-1.5" /> 清空
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <Popover open={isCustomerSearchOpen} onOpenChange={setIsCustomerSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 justify-between bg-muted/10 border-none font-bold text-sm rounded-xl px-4 hover:bg-muted/20"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <User className="w-4 h-4 text-primary" />
                                        <span>{selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : "公共账户 (散客)"}</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[300px] border-none shadow-2xl rounded-2xl overflow-hidden" align="start">
                                <div className="p-2 bg-muted/30 border-b">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            className="h-9 pl-8 text-xs bg-background border-none focus-visible:ring-primary/20"
                                            placeholder="输入姓名或手机号搜索..."
                                            value={customerSearchQuery}
                                            onChange={e => setCustomerSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                                    <div
                                        className={cn(
                                            "flex flex-col p-2 rounded-lg cursor-pointer transition-colors text-sm mb-1",
                                            !selectedCustomerId ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                                        )}
                                        onClick={() => {
                                            setSelectedCustomerId(null)
                                            setIsCustomerSearchOpen(false)
                                            setCustomerSearchQuery('')
                                        }}
                                    >
                                        公共账户 (散客)
                                    </div>

                                    {filteredCustomers.length > 0 ? (
                                        filteredCustomers.map(c => (
                                            <div
                                                key={c.id}
                                                className={cn(
                                                    "flex flex-col p-2 rounded-lg cursor-pointer transition-colors text-sm mb-1",
                                                    selectedCustomerId === c.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                                                )}
                                                onClick={() => {
                                                    setSelectedCustomerId(c.id)
                                                    setIsCustomerSearchOpen(false)
                                                    setCustomerSearchQuery('')
                                                }}
                                            >
                                                <div className="font-bold">{c.name}</div>
                                                <div className="text-[10px] text-muted-foreground">{c.phone || "无号码"}</div>
                                            </div>
                                        ))
                                    ) : customerSearchQuery.trim() ? (
                                        <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
                                            <DialogTrigger asChild>
                                                <div className="p-4 text-center cursor-pointer hover:bg-primary/5 transition-colors rounded-lg border border-dashed border-primary/30 mt-2">
                                                    <div className="text-sm font-bold text-primary flex items-center justify-center gap-2">
                                                        <Plus size={14} /> 新增客户 "{customerSearchQuery}"
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[400px] rounded-2xl border-none shadow-2xl">
                                                <DialogHeader>
                                                    <DialogTitle className="font-black text-xl">快速新增客户档案</DialogTitle>
                                                </DialogHeader>
                                                <form onSubmit={handleCreateCustomer} className="space-y-5 py-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">客户姓名 *</Label>
                                                        <Input required value={newCustomerData.name} onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })} placeholder="请输入客户姓名" className="h-11 rounded-xl bg-muted/30 border-none" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">联系电话</Label>
                                                        <Input value={newCustomerData.phone} onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })} placeholder="请输入手机号" className="h-11 rounded-xl bg-muted/30 border-none" />
                                                    </div>
                                                    <Button
                                                        type="submit"
                                                        className="w-full h-11 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
                                                        disabled={customerLoading}
                                                    >
                                                        {customerLoading ? '保存中...' : '保存并自动关联'}
                                                    </Button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    ) : customers.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground italic">
                                            暂无客户，请先新增
                                        </div>
                                    ) : null}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar bg-zinc-50/50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 space-y-4">
                            <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
                                <ShoppingCart size={40} />
                            </div>
                            <p className="font-bold tracking-tight">购物车正等待您的挑选</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="group relative flex gap-3 bg-card border hover:border-primary/40 transition-all p-3 rounded-2xl items-center shadow-sm">
                                <div className="w-14 h-14 bg-secondary/50 rounded-xl overflow-hidden shrink-0">
                                    {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground/50 italic font-bold">N/A</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate text-sm mb-1 text-zinc-700">{item.name}</div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-primary font-mono font-bold text-xs bg-primary/5 px-1.5 py-0.5 rounded">¥{item.salePrice}</div>
                                    </div>
                                </div>
                                <div className="flex items-center bg-muted/50 rounded-xl p-1 shadow-inner">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-white/70" onClick={() => updateQty(item.id, item.cartQty - 1)}>-</Button>
                                    <NumberInput
                                        className="w-14 h-7 text-center text-xs font-black bg-transparent border-none focus-visible:ring-0 p-0"
                                        value={item.cartQty}
                                        onChange={(v) => updateQty(item.id, v)}
                                    />
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-white/70" onClick={() => updateQty(item.id, item.cartQty + 1)}>+</Button>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 absolute -top-2 -right-2 bg-white/90 backdrop-blur-sm border rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md z-10" onClick={() => removeFromCart(item.id)}>
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-gradient-to-b from-transparent to-muted/10 border-t space-y-5 rounded-b-2xl shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-end px-1">
                        <div className="space-y-1">
                            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">已选 {cart.reduce((s, i) => s + i.cartQty, 0)} 件商品</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-black px-2 py-1 rounded-full text-[10px]">待结总额</Badge>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-4xl font-black text-primary tracking-tighter font-mono">¥{cartTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                        <Button
                            size="lg"
                            className="w-full text-xl h-16 rounded-2xl font-black shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90 text-white"
                            onClick={openCheckout}
                            disabled={cart.length === 0 || loading}
                        >
                            {loading ? <div className="animate-spin rounded-full h-7 w-7 border-3 border-white border-t-transparent" /> : <><CreditCard className="mr-3" /> 收款结算 (F8)</>}
                        </Button>

                        <DialogContent className={cn(
                            "p-0 overflow-hidden border-none rounded-b-none sm:rounded-3xl transition-all duration-500 shadow-2xl",
                            checkoutStage === 'review' ? "max-w-full sm:max-w-[950px]" : "max-w-full sm:max-w-[480px]",
                            "h-[90vh] sm:h-auto bottom-0 sm:bottom-auto top-auto sm:top-[50%] sm:translate-y-[-50%]"
                        )}>
                            {checkoutStage === 'review' ? (
                                <div className="bg-card flex flex-col h-[85vh] sm:h-auto">
                                    <div className="bg-primary/5 p-4 sm:p-8 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                <ShoppingCart size={20} className="sm:w-6 sm:h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-800">核对清单</h2>
                                                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5 max-w-[200px] sm:max-w-none truncate sm:whitespace-normal">请核对账目明细准确无误</p>
                                            </div>
                                        </div>
                                        <div className="text-right bg-white/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">应收合计</p>
                                            <p className="text-2xl sm:text-3xl font-black text-primary font-mono tracking-tighter">¥{cartTotal.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                                        {/* Desktop Table */}
                                        <table className="hidden sm:table w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-muted/30 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b sticky top-0 z-20 backdrop-blur-md">
                                                    <th className="px-8 py-5">商品名称 / 条码</th>
                                                    <th className="px-5 py-5 text-center">标准单价</th>
                                                    <th className="px-5 py-5 text-center">优惠执行价 (可改)</th>
                                                    <th className="px-5 py-5 text-center">单位</th>
                                                    <th className="px-5 py-5 text-center">销售数量 (可改)</th>
                                                    <th className="px-8 py-5 text-right">小计金额</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100">
                                                {cart.map((item) => (
                                                    <tr key={item.id} className="hover:bg-primary/[0.02] transition-colors group">
                                                        <td className="px-8 py-5">
                                                            <div className="font-bold text-zinc-700 group-hover:text-primary transition-colors">{item.name}</div>
                                                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.barcode || '无条码记录'}</div>
                                                        </td>
                                                        <td className="px-5 py-5 text-center font-mono font-bold text-zinc-400">¥{item.retail_price}</td>
                                                        <td className="px-5 py-5 text-center">
                                                            <div className="relative inline-block w-28">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold text-xs pointer-events-none">¥</span>
                                                                <NumberInput
                                                                    className="h-9 pl-5 pr-2 font-mono font-black text-sm text-primary bg-zinc-50 border-zinc-200 focus:bg-white rounded-lg text-center"
                                                                    value={item.salePrice}
                                                                    onChange={(v) => updateSalePrice(item.id, v)}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-5 text-center">
                                                            <span className="text-[10px] bg-zinc-100 px-2.5 py-1 rounded-full font-black text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">{item.unit || '件'}</span>
                                                        </td>
                                                        <td className="px-5 py-5 text-center">
                                                            <NumberInput
                                                                className="h-9 w-24 mx-auto font-black text-sm text-zinc-800 bg-zinc-50 border-zinc-200 focus:bg-white rounded-lg text-center"
                                                                value={item.cartQty}
                                                                onChange={(v) => updateQty(item.id, v)}
                                                            />
                                                            <div className="text-[9px] text-muted-foreground mt-1 font-bold">库存剩余: {item.stock_quantity}</div>
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-black text-primary font-mono text-lg">¥{(item.salePrice * item.cartQty).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Mobile List View */}
                                        <div className="sm:hidden divide-y">
                                            {cart.map((item) => (
                                                <div key={item.id} className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-zinc-800 truncate">{item.name}</div>
                                                            <div className="text-[10px] text-muted-foreground font-mono">#{item.barcode || '无条码'}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-lg font-black text-primary font-mono">¥{(item.salePrice * item.cartQty).toFixed(2)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">执行单价</Label>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold text-xs">¥</span>
                                                                <NumberInput
                                                                    className="h-9 pl-5 bg-muted/30 border-none rounded-lg font-bold text-sm"
                                                                    value={item.salePrice}
                                                                    onChange={(v) => updateSalePrice(item.id, v)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">销售数量</Label>
                                                            <NumberInput
                                                                className="h-9 bg-muted/30 border-none rounded-lg font-bold text-sm"
                                                                value={item.cartQty}
                                                                onChange={(v) => updateQty(item.id, v)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-8 bg-zinc-50 border-t flex flex-col gap-4 sm:gap-5 shrink-0">
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                            <div className="flex items-center justify-between sm:justify-start gap-3">
                                                <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest shrink-0">额外优惠</Label>
                                                <div className="relative w-32">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">¥</span>
                                                    <NumberInput
                                                        className="pl-7 h-10 font-black text-red-500 bg-white border-zinc-200 rounded-xl focus:ring-primary/20"
                                                        value={miscDiscount}
                                                        onChange={setMiscDiscount}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-right border-t sm:border-none pt-3 sm:pt-0">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">应收小计</p>
                                                <p className="text-2xl font-black text-primary font-mono tabular-nums">¥{Math.max(0, cartTotal - miscDiscount).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5">
                                            <Button variant="outline" className="h-12 sm:h-16 rounded-xl sm:rounded-2xl font-black text-muted-foreground border-none bg-zinc-100 sm:bg-white hover:bg-zinc-200 transition-all uppercase tracking-widest text-[10px] sm:text-xs order-2 sm:order-1" onClick={() => { setCheckoutOpen(false); setMiscDiscount(0); }}>
                                                取消收款
                                            </Button>
                                            <Button className="flex-[2.5] h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg sm:text-xl gap-4 shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all order-1 sm:order-2" onClick={() => setCheckoutStage('payment')}>
                                                确认无误，去收款 <CheckCircle2 size={24} className="hidden sm:inline" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="bg-primary p-6 sm:p-8 text-white relative overflow-hidden shrink-0">
                                        <div className="relative z-10 flex justify-between items-center gap-4">
                                            <div className="space-y-1">
                                                <p className="text-primary-foreground/70 text-[10px] font-black uppercase tracking-[0.2em]">待收账款</p>
                                                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter">¥{cartTotal.toFixed(2)}</h2>
                                            </div>
                                            <div className="w-14 h-14 sm:w-18 sm:h-18 bg-white/20 rounded-2xl sm:rounded-3xl flex items-center justify-center backdrop-blur-md shadow-2xl border border-white/20 transform rotate-12 shrink-0">
                                                <CreditCard size={28} className="sm:w-9 sm:h-9" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 bg-card overflow-y-auto custom-scrollbar">
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">选择支付方式</Label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { id: 'wechat', name: '微信', color: 'bg-emerald-500' },
                                                    { id: 'alipay', name: '支付宝', color: 'bg-blue-500' },
                                                    { id: 'cash', name: '现金', color: 'bg-amber-500' },
                                                    { id: 'card', name: '刷卡', color: 'bg-indigo-500' }
                                                ].map(method => (
                                                    <button
                                                        key={method.id}
                                                        onClick={() => setPaymentMethod(method.id)}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 relative overflow-hidden",
                                                            paymentMethod === method.id
                                                                ? "border-primary bg-primary/5 shadow-inner scale-[1.05] z-10"
                                                                : "border-muted/40 hover:border-zinc-300 opacity-60 hover:opacity-100"
                                                        )}
                                                    >
                                                        <div className={cn("w-2.5 h-2.5 rounded-full", method.color)} />
                                                        <span className={cn("text-xs font-black", paymentMethod === method.id ? "text-primary" : "text-muted-foreground")}>
                                                            {method.name}
                                                        </span>
                                                        {paymentMethod === method.id && (
                                                            <div className="absolute top-1 right-1">
                                                                <CheckCircle2 size={10} className="text-primary" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">实收结算金额 (¥)</Label>
                                            <div className="relative group">
                                                <span className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 font-black text-2xl sm:text-3xl text-muted-foreground/20 group-focus-within:text-primary/30 transition-all duration-300">¥</span>
                                                <NumberInput
                                                    autoFocus
                                                    className="h-16 sm:h-24 pl-10 sm:pl-14 text-3xl sm:text-5xl font-black bg-zinc-50 border-none rounded-2xl sm:rounded-3xl focus-visible:ring-primary/10 shadow-inner font-mono tracking-tighter"
                                                    value={receivedAmount}
                                                    onChange={setReceivedAmount}
                                                />
                                            </div>

                                            <div className="flex justify-between items-center px-2">
                                                {discountAmount > 0 ? (
                                                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                        <span className="text-xs font-black text-red-500 uppercase tracking-widest">
                                                            已扣除优惠金额: -¥{discountAmount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ) : discountAmount < 0 ? (
                                                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest px-1">
                                                        溢价收入收益: +¥{Math.abs(discountAmount).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">全额收款 (无折扣)</span>
                                                )}
                                                <div className="text-[10px] font-bold text-muted-foreground bg-zinc-100 px-3 py-1 rounded-full">
                                                    原额: ¥{cartTotal.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                                            <Button variant="ghost" className="h-12 sm:h-16 rounded-xl sm:rounded-2xl font-black text-muted-foreground hover:bg-zinc-100 uppercase tracking-widest text-[10px] transition-all order-2 sm:order-1" onClick={() => setCheckoutStage('review')}>
                                                <ArrowLeft size={16} className="mr-2" /> 上一步
                                            </Button>
                                            <Button className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-black hover:bg-zinc-900 text-white font-black text-lg sm:text-xl gap-4 shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all order-1 sm:order-2" onClick={handleConfirmPayment}>
                                                <CheckCircle2 size={24} className="hidden sm:inline" /> 确认收款
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Mobile Footer Toggle - Repositioned to sit above Global Nav */}
            <div className="md:hidden fixed bottom-[72px] left-4 right-4 bg-white/95 backdrop-blur-sm border p-4 flex items-center justify-between z-[45] shadow-2xl rounded-2xl animate-in slide-in-from-bottom-5">
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">已选 {cart.reduce((s, i) => s + i.cartQty, 0)} 件</span>
                    <span className="text-2xl font-black text-primary font-mono tracking-tighter">¥{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-12 w-12 rounded-xl relative"
                        onClick={() => setIsMobileCartOpen(true)}
                    >
                        <ShoppingCart size={20} />
                        {cart.length > 0 && (
                            <span key={cart.reduce((s, i) => s + i.cartQty, 0)} className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in duration-300">
                                {cart.reduce((s, i) => s + Number(i.cartQty), 0)}
                            </span>
                        )}
                    </Button>
                    <Button
                        className="h-12 px-6 rounded-xl font-bold bg-primary text-white"
                        disabled={cart.length === 0}
                        onClick={openCheckout}
                    >
                        去结算
                    </Button>
                </div>
            </div>
        </div>
    )
}

function Badge({ children, variant, className }: any) {
    return (
        <span className={cn(
            "px-2 py-0.5 rounded text-[10px] uppercase font-bold",
            variant === 'secondary' ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
            className
        )}>
            {children}
        </span>
    )
}
