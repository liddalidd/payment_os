'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Search, Plus, Trash2, ArrowLeft, PackageCheck, PackagePlus, Barcode, DollarSign, Box, Receipt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PurchaseItem {
    productId: string | null // null 表示新商品
    name: string
    barcode: string
    unit: string // 单位
    quantity: number
    price: number // 本次进价
    retailPrice: number // 建议零售价（仅新商品需要）
    originalStock: number
    originalCost: number
    allocatedCost: number // 分摊后单价
    isNew: boolean
}

export default function PurchasePage() {
    const router = useRouter()
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])
    const [shippingFee, setShippingFee] = useState(0)
    const [otherCosts, setOtherCosts] = useState(0)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        async function fetchData() {
            const [suppRes, prodRes] = await Promise.all([
                api.suppliers.list(),
                api.products.list(),
            ])
            if (suppRes.data) setSuppliers(suppRes.data.slice().sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'zh-CN')))
            if (prodRes.data) setProducts(prodRes.data.slice().sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'zh-CN')))
            setLoading(false)
        }
        fetchData()
    }, [])

    const addItem = (product: any) => {
        if (purchaseItems.find(i => i.productId === product.id)) return
        setPurchaseItems([
            ...purchaseItems,
            {
                productId: product.id,
                name: product.name,
                barcode: product.barcode || '',
                unit: product.unit || '件',
                quantity: 1,
                price: product.cost_price || 0,
                retailPrice: product.retail_price || 0,
                originalStock: product.stock_quantity || 0,
                originalCost: product.cost_price || 0,
                allocatedCost: 0,
                isNew: false
            }
        ])
        setSearchQuery('')
    }

    const addNewItem = () => {
        setPurchaseItems([
            ...purchaseItems,
            {
                productId: null,
                name: searchQuery || '新商品',
                barcode: '',
                unit: '件',
                quantity: 1,
                price: 0,
                retailPrice: 0,
                originalStock: 0,
                originalCost: 0,
                allocatedCost: 0,
                isNew: true
            }
        ])
        setSearchQuery('')
    }

    const removeItem = (index: number) => {
        setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
        setPurchaseItems(purchaseItems.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ))
    }

    // 计算分摊费用和最终成本
    const totalGoodsValue = purchaseItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const totalExtraCosts = Number(shippingFee) + Number(otherCosts)

    const processedItems = purchaseItems.map(item => {
        const itemTotalValue = item.price * item.quantity
        // 按总耗价值占比分摊额外成本
        const shareOfCosts = totalGoodsValue > 0 ? (itemTotalValue / totalGoodsValue) * totalExtraCosts : 0
        const perUnitExtraCost = item.quantity > 0 ? shareOfCosts / item.quantity : 0
        const finalWeightedCost = Number(item.price) + perUnitExtraCost

        return {
            ...item,
            allocatedCost: finalWeightedCost
        }
    })

    const handleSubmit = async () => {
        if (!selectedSupplierId) return alert('请选择供应商')
        if (purchaseItems.length === 0) return alert('请添加进货商品')

        // 基础校验
        for (const item of purchaseItems) {
            if (!item.name) return alert('商品名称不能为空')
            if (item.quantity <= 0) return alert(`${item.name} 数量必须大于 0`)

            // 名称唯一性校验（针对新商品且无条码）
            if (item.isNew && !item.barcode) {
                const isDuplicate = products.some(p => p.name === item.name)
                if (isDuplicate) return alert(`商品 "${item.name}" 已存在，请更改名称或输入条码`)
            }
        }

        setSubmitting(true)

        const { error } = await api.purchaseOrders.create({
            supplier_id: selectedSupplierId,
            shipping_fee: Number(shippingFee) || 0,
            other_costs: Number(otherCosts) || 0,
            items: processedItems.map(item => ({
                productId: item.productId,
                isNew: item.isNew,
                name: item.name,
                barcode: item.barcode,
                unit: item.unit,
                quantity: Number(item.quantity),
                price: Number(item.price),
                retailPrice: Number(item.retailPrice),
                originalStock: Number(item.originalStock),
                originalCost: Number(item.originalCost),
                allocatedCost: Number(item.allocatedCost),
            })),
        })

        setSubmitting(false)

        if (error) {
            alert('提交失败: ' + error.message)
            return
        }

        alert('进货入库成功，新商品已自动建档！')
        router.push('/inventory')
    }

    const filteredSearchRows = searchQuery ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.includes(searchQuery)
    ).slice(0, 5) : []

    if (loading) return <div className="p-8 text-center text-muted-foreground">正在加载基础数据...</div>

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">批量进货入库</h1>
                    <p className="text-sm text-muted-foreground">支持动态新增商品、运费分摊及加权平均成本自动核算。</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left (2/3): Items Table */}
                <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
                    <Card className="min-h-[500px] flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center mb-4">
                                <CardTitle className="text-lg">进货清单</CardTitle>
                                <Badge variant="outline" className="px-3">已选 {purchaseItems.length} 项商品</Badge>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="搜索现有商品，或直接输入名称创建新商品..."
                                    className="pl-8 h-12 text-base"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && searchQuery && addNewItem()}
                                />

                                {/* Search Results / Suggestion to add new */}
                                {(filteredSearchRows.length > 0 || searchQuery) && (
                                    <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-2xl border-primary/20 bg-card overflow-hidden">
                                        <div className="p-1">
                                            {filteredSearchRows.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="flex items-center justify-between p-3 hover:bg-primary/5 rounded-md cursor-pointer transition-colors border-b last:border-0"
                                                    onClick={() => addItem(p)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center text-xs">
                                                            {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover rounded" /> : <Box size={16} />}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{p.name}</div>
                                                            <div className="text-xs text-muted-foreground">条码: {p.barcode || '-'} | 库存: {p.stock_quantity}</div>
                                                        </div>
                                                    </div>
                                                    <Plus size={18} className="text-primary" />
                                                </div>
                                            ))}
                                            {searchQuery && (
                                                <div
                                                    className="flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/20 rounded-md cursor-pointer transition-colors border-t border-primary/20"
                                                    onClick={addNewItem}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <PackagePlus className="text-primary" />
                                                        <div>
                                                            <div className="font-bold text-primary">新增商品: "{searchQuery}"</div>
                                                            <div className="text-xs text-primary/70">库中未找到，点击在此直接建档进货</div>
                                                        </div>
                                                    </div>
                                                    <Plus size={20} className="text-primary font-bold" />
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-0 border-t">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[200px] pl-6">商品信息</TableHead>
                                        <TableHead className="text-center w-[120px]">数量</TableHead>
                                        <TableHead className="text-right w-[140px]">单价 (进价)</TableHead>
                                        <TableHead className="text-right w-[140px]">分摊后成本</TableHead>
                                        <TableHead className="w-[60px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <PackageSearch size={48} strokeWidth={1} />
                                                    <p>清单空空如也，请在上方搜寻商品</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        processedItems.map((item, idx) => (
                                            <TableRow key={idx} className={item.isNew ? "bg-amber-50/30" : ""}>
                                                <TableCell className="pl-6 py-4">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                className="h-8 font-medium bg-transparent border-dashed focus:border-solid p-0 pl-1 border-x-0 border-t-0 rounded-none shadow-none focus-visible:ring-0"
                                                                value={item.name}
                                                                onChange={e => updateItem(idx, 'name', e.target.value)}
                                                            />
                                                            {item.isNew && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] h-4">新商品</Badge>}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                            <span className="shrink-0">单位:</span>
                                                            <Input
                                                                placeholder="单位"
                                                                className="h-6 w-16 text-xs bg-transparent border-none p-0 focus-visible:ring-0 font-bold"
                                                                value={item.unit}
                                                                onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Barcode size={12} />
                                                            <Input
                                                                placeholder="条码"
                                                                className="h-6 w-32 text-xs bg-transparent border-none p-0 focus-visible:ring-0"
                                                                value={item.barcode}
                                                                onChange={e => updateItem(idx, 'barcode', e.target.value)}
                                                            />
                                                        </div>
                                                        {(item.isNew || item.retailPrice === 0) && (
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <DollarSign size={12} />
                                                                <span className="shrink-0">建议零售价:</span>
                                                                <NumberInput
                                                                    className="h-6 w-20 text-xs bg-transparent border-none p-0 focus-visible:ring-0 font-bold"
                                                                    value={item.retailPrice}
                                                                    onChange={v => updateItem(idx, 'retailPrice', v)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center">
                                                        <NumberInput
                                                            className="w-20 text-center h-10 text-lg font-bold"
                                                            value={item.quantity}
                                                            onChange={v => updateItem(idx, 'quantity', v)}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end">
                                                        <NumberInput
                                                            className="w-24 text-right h-10 font-mono"
                                                            value={item.price}
                                                            onChange={v => updateItem(idx, 'price', v)}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono text-emerald-600 font-bold">¥{item.allocatedCost.toFixed(2)}</span>
                                                        <span className="text-[10px] text-muted-foreground">含费分摊</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-red-500 transition-colors"
                                                        onClick={() => removeItem(idx)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right (1/3): Summary & Configuration */}
                <div className="lg:col-span-1 space-y-6 order-1 lg:order-2">
                    <Card className="sticky top-6 border-primary/20 shadow-xl overflow-hidden">
                        <div className="h-2 bg-primary"></div>
                        <CardHeader>
                            <CardTitle className="text-xl">入库确认</CardTitle>
                            <CardDescription>设置进货基础信息及额外成本分摊</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold">供货厂商</Label>
                                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="请选择供应商" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold">运费 (¥)</Label>
                                        <div className="relative">
                                            <DollarSign size={14} className="absolute left-3 top-3.5 text-muted-foreground" />
                                            <NumberInput
                                                className="pl-8 h-11"
                                                value={shippingFee}
                                                onChange={setShippingFee}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold">其他成本 (¥)</Label>
                                        <div className="relative">
                                            <DollarSign size={14} className="absolute left-3 top-3.5 text-muted-foreground" />
                                            <NumberInput
                                                className="pl-8 h-11"
                                                value={otherCosts}
                                                onChange={setOtherCosts}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 py-4 border-y border-dashed">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>货值总计:</span>
                                    <span>¥{totalGoodsValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-amber-600">
                                    <span>额外支出:</span>
                                    <span>¥{totalExtraCosts.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold pt-2 mt-2">
                                    <span>总计成本:</span>
                                    <span className="text-primary tracking-tight">¥{(totalGoodsValue + totalExtraCosts).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Button variant="outline" size="sm" onClick={() => router.push('/purchase/records')} className="rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-100 px-4">
                                    <Receipt className="mr-2 h-4 w-4" /> 查看入库记录
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={purchaseItems.length === 0 || !selectedSupplierId || submitting}
                                    className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-12 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? '提交中...' : '确认并入库'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/40 border-none shadow-none">
                        <CardContent className="p-4 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">操作指南</h4>
                            <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                                <li>搜索不到商品时，按回车或点击下方提示即可**新增商品**。</li>
                                <li>新商品背景为淡黄色，提交后会自动同步到商品库。</li>
                                <li>最终成本 = 本次进价 + (杂费 / 整单货值 * 该项货值 / 该项数量)。</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function PackageSearch(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
            <path d="m7.5 4.27 9 5.15" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" x2="12" y1="22" y2="12" />
            <circle cx="18.5" cy="15.5" r="2.5" />
            <path d="M20.27 17.27 22 19" />
        </svg>
    )
}
