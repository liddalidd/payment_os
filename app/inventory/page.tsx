'use client'

import { api } from '@/lib/api'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Package, Trash2, ArrowLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { ImagePicker } from '@/components/ui/image-picker'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function InventoryPage() {
    const [products, setProducts] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        setLoading(true)
        const { data, error } = await api.products.list()
        if (error) console.error(error)
        else setProducts((data || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN')))
        setLoading(false)
    }

    const handleUpdate = async () => {
        if (!editingProduct) return

        // 校验：如果没有条码，检查名称是否唯一（排除自身）
        if (!editingProduct.barcode) {
            const isDuplicate = products.some(p => p.name === editingProduct.name && p.id !== editingProduct.id)
            if (isDuplicate) return alert('商品名已存在，请更改名称或输入条码')
        }

        const { error } = await api.products.update(editingProduct.id, {
            name: editingProduct.name,
            barcode: editingProduct.barcode || null,
            retail_price: Number(editingProduct.retail_price),
            cost_price: Number(editingProduct.cost_price),
            stock_quantity: Number(editingProduct.stock_quantity),
            unit: editingProduct.unit || '件',
            image_url: editingProduct.image_url || null,
        })

        if (error) alert('更新失败: ' + error.message)
        else {
            setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p))
            setIsEditDialogOpen(false)
        }
    }

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('确定要删除该商品吗？删除后不可恢复。')) return

        const { error } = await api.products.remove(id)
        if (error) {
            alert(error.message || '删除失败')
        } else {
            setProducts(products.filter(p => p.id !== id))
            setIsEditDialogOpen(false)
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.includes(searchQuery)
    )

    const openEdit = (product: any) => {
        setEditingProduct({ ...product, unit: product.unit || '件' })
        setIsEditDialogOpen(true)
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">正在加载库存数据...</div>

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">商品库存查询</h1>
                    <p className="text-sm text-muted-foreground">管理门店商品档案及其库存状态。</p>
                </div>
                <Link href="/purchase">
                    <Button className="gap-2">
                        <Plus size={18} /> 批量进货/新货入库
                    </Button>
                </Link>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索商品名称或条码..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">商品信息</th>
                                <th className="p-4 font-semibold">条码</th>
                                <th className="p-4 font-semibold">单位</th>
                                <th className="p-4 font-semibold">零售价</th>
                                <th className="p-4 font-semibold">平均成本</th>
                                <th className="p-4 font-semibold">当前库存</th>
                                <th className="p-4 font-semibold">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                                        未找到匹配商品
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-secondary rounded-md overflow-hidden flex items-center justify-center">
                                                {product.image_url ? (
                                                    <img src={product.image_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package size={18} className="text-muted-foreground" />
                                                )}
                                            </div>
                                            <span className="font-medium">{product.name}</span>
                                        </td>
                                        <td className="p-4 text-muted-foreground text-sm font-mono">{product.barcode || '-'}</td>
                                        <td className="p-4 text-muted-foreground">{product.unit || '件'}</td>
                                        <td className="p-4 font-bold">¥{product.retail_price}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono">¥{product.cost_price || '0.00'}</span>
                                                <span className="text-[10px] text-muted-foreground">平均成本</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "font-medium px-2 py-1 rounded-full text-xs",
                                                product.stock_quantity <= (product.min_stock_level || 5)
                                                    ? "bg-red-100 text-red-700 font-bold"
                                                    : "bg-emerald-100 text-emerald-700 font-bold"
                                            )}>
                                                {product.stock_quantity}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                                                    <Edit size={16} className="text-muted-foreground" />
                                                </Button>
                                                <Link href="/purchase">
                                                    <Button variant="ghost" size="sm" className="text-primary text-xs font-bold">补货</Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 编辑商品 Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>编辑商品档案</DialogTitle>
                    </DialogHeader>
                    {editingProduct && (
                        <div className="space-y-4 py-4">
                            <div className="flex justify-center mb-2">
                                <ImagePicker
                                    value={editingProduct.image_url}
                                    onChange={url => setEditingProduct({ ...editingProduct, image_url: url })}
                                    size="md"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">商品名称 *</Label>
                                    <Input value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">条码 (唯一标识)</Label>
                                    <Input value={editingProduct.barcode || ''} placeholder="可留空使用名称唯一" onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">单位</Label>
                                    <Input value={editingProduct.unit || ''} placeholder="如：件, 瓶, KG" onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">当前零售价 (¥)</Label>
                                    <NumberInput placeholder="0.00" value={editingProduct.retail_price} onChange={v => setEditingProduct({ ...editingProduct, retail_price: v })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">平均成本 (¥)</Label>
                                    <NumberInput placeholder="0.00" value={editingProduct.cost_price} onChange={v => setEditingProduct({ ...editingProduct, cost_price: v })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">当前库存</Label>
                                    <NumberInput placeholder="0" value={editingProduct.stock_quantity} onChange={v => setEditingProduct({ ...editingProduct, stock_quantity: v })} />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex justify-between sm:justify-between items-center w-full border-t pt-4">
                        <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => editingProduct && handleDeleteProduct(editingProduct.id)}>
                            <Trash2 size={16} className="mr-2" /> 删除商品
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
                            <Button onClick={handleUpdate} className="bg-primary shadow-lg shadow-primary/20">保存修改</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
