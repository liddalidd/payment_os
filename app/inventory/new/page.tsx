'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { ImagePicker } from '@/components/ui/image-picker'
import { api } from '@/lib/api'

export default function NewProductPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<{
        name: string
        barcode: string
        retail_price: number
        cost_price: number
        stock_quantity: number
        image_url: string | null
    }>({
        name: '',
        barcode: '',
        retail_price: 0,
        cost_price: 0,
        stock_quantity: 0,
        image_url: null,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await api.products.create({
            name: formData.name,
            barcode: formData.barcode || null,
            retail_price: formData.retail_price,
            cost_price: formData.cost_price,
            stock_quantity: formData.stock_quantity,
            image_url: formData.image_url,
        })

        setLoading(false)

        if (error) {
            alert('添加失败: ' + error.message)
            return
        }

        router.push('/inventory')
        router.refresh()
    }

    return (
        <div className="p-4 max-w-lg mx-auto space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft size={20} />
                </Button>
                <h1 className="text-xl font-bold">录入新商品</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Image Upload Area */}
                <div className="flex justify-center">
                    <ImagePicker
                        size="lg"
                        value={formData.image_url}
                        onChange={url => setFormData({ ...formData, image_url: url })}
                    />
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="barcode">条码 (可扫码)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="barcode"
                                placeholder="扫描或输入条码"
                                value={formData.barcode}
                                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                            />
                            <Button type="button" variant="outline" size="icon">
                                <Camera size={18} />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">商品名称 <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            required
                            placeholder="例如：纯棉T恤 白色 L"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cost_price">进价 (¥)</Label>
                            <NumberInput
                                id="cost_price"
                                placeholder="0.00"
                                value={formData.cost_price}
                                onChange={v => setFormData({ ...formData, cost_price: v })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="retail_price">零售价 (¥)</Label>
                            <NumberInput
                                id="retail_price"
                                placeholder="0.00"
                                value={formData.retail_price}
                                onChange={v => setFormData({ ...formData, retail_price: v })}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="stock">初始库存</Label>
                            <NumberInput
                                id="stock"
                                placeholder="0"
                                value={formData.stock_quantity}
                                onChange={v => setFormData({ ...formData, stock_quantity: v })}
                            />
                        </div>
                    </div>
                </div>

                <Button type="submit" className="w-full text-lg py-6" disabled={loading}>
                    {loading ? '保存中...' : '确认录入'}
                </Button>
            </form>
        </div>
    )
}
