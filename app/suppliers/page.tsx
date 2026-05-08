'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import { Plus, Search, Building2, Phone, User, Mail, MapPin, Trash2, Edit } from 'lucide-react'

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
    })

    useEffect(() => {
        fetchSuppliers()
    }, [])

    async function fetchSuppliers() {
        const { data } = await api.suppliers.list()
        if (data) setSuppliers(data)
        setLoading(false)
    }

    const resetForm = () => {
        setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' })
        setEditingId(null)
    }

    const handleSave = async () => {
        if (!formData.name) return alert('请填写供应商名称')

        if (editingId) {
            const { error } = await api.suppliers.update(editingId, formData)
            if (error) return alert('更新失败: ' + error.message)
            setSuppliers(suppliers.map(s => s.id === editingId ? { ...s, ...formData } : s))
            setOpen(false)
            resetForm()
        } else {
            const { data, error } = await api.suppliers.create(formData)
            if (error) return alert('添加失败: ' + error.message)
            if (data) {
                setSuppliers([data, ...suppliers])
                setOpen(false)
                resetForm()
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除该供应商吗？')) return
        const { error } = await api.suppliers.remove(id)
        if (error) return alert(error.message || '删除失败')
        setSuppliers(suppliers.filter(s => s.id !== id))
    }

    const startEdit = (supplier: any) => {
        setEditingId(supplier.id)
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || ''
        })
        setOpen(true)
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone?.includes(searchQuery)
    )

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">供应商管理</h1>
                    <p className="text-sm text-muted-foreground">管理您的采购渠道与联系人信息。</p>
                </div>

                <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={16} /> 新增供应商
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? '编辑供应商' : '新增供应商'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>公司/供应商名称</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>联系人</Label>
                                    <Input value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>电话</Label>
                                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>邮箱</Label>
                                <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>地址</Label>
                                <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                            <Button onClick={handleSave}>保存</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="搜索供应商、联系人、电话..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">加载中...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSuppliers.map(supplier => (
                        <Card key={supplier.id} className="group hover:border-primary/50 transition-colors">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Building2 size={18} />
                                        </div>
                                        <span className="font-bold">{supplier.name}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(supplier)}>
                                            <Edit size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(supplier.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <User size={14} /> {supplier.contact_person || '未填写'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} /> {supplier.phone || '未填写'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} /> {supplier.email || '未填写'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="flex-shrink-0" />
                                        <span className="line-clamp-1">{supplier.address || '未填写'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredSuppliers.length === 0 && (
                        <div className="col-span-full border-2 border-dashed rounded-xl py-20 text-center text-muted-foreground">
                            未找到相关供应商
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
