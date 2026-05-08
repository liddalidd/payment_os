'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, User, MapPin, Phone, MoreHorizontal, Edit, Trash, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Customer {
    id: string
    name: string
    phone: string
    region: string
    points: number
    created_at: string
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [open, setOpen] = useState(false)
    const [formData, setFormData] = useState({ name: '', phone: '', region: '' })
    const [isEditing, setIsEditing] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const fetchCustomers = async () => {
        const { data } = await api.customers.list()
        if (data) setCustomers(data)
    }

    useEffect(() => {
        fetchCustomers()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isEditing && currentId) {
            const { error } = await api.customers.update(currentId, formData)
            if (error) alert('更新失败: ' + error.message)
        } else {
            const { error } = await api.customers.create(formData)
            if (error) alert('添加失败: ' + error.message)
        }

        setOpen(false)
        resetForm()
        fetchCustomers()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('确定删除该客户吗？')) return
        const { error } = await api.customers.remove(id)
        if (!error) {
            setCustomers(customers.filter(c => c.id !== id))
        } else {
            alert(error.message || '删除失败，可能该客户有历史订单关联。')
        }
    }

    const startEdit = (customer: Customer) => {
        setFormData({ name: customer.name, phone: customer.phone, region: customer.region || '' })
        setIsEditing(true)
        setCurrentId(customer.id)
        setOpen(true)
    }

    const resetForm = () => {
        setFormData({ name: '', phone: '', region: '' })
        setIsEditing(false)
        setCurrentId(null)
    }

    const filteredCustomers = customers
        .filter(c =>
            c.name.includes(searchQuery) ||
            (c.phone && c.phone.includes(searchQuery))
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

    return (
        <div className="p-4 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h1 className="text-2xl font-bold tracking-tight">客户管理</h1>
                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="搜索客户姓名或手机号..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background"
                        />
                    </div>
                </div>
                <Dialog open={open} onOpenChange={(val) => {
                    setOpen(val)
                    if (!val) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-1">
                            <Plus size={16} /> 新增客户
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{isEditing ? '编辑客户档案' : '新增客户档案'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>客户姓名</Label>
                                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="例如: 张三" />
                            </div>
                            <div className="space-y-2">
                                <Label>联系电话</Label>
                                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="手机号" />
                            </div>
                            <div className="space-y-2">
                                <Label>所在区域</Label>
                                <Input value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} placeholder="例如: 华北区" />
                            </div>
                            <Button type="submit" className="w-full">保存档案</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer) => (
                    <Card key={customer.id}>
                        <CardContent className="p-4 flex gap-4 items-start">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <User size={24} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between">
                                    <h3 className="font-bold">{customer.name}</h3>
                                    <div className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">积分: {customer.points}</div>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground gap-2">
                                    <Phone size={14} /> {customer.phone || '无电话'}
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground gap-2">
                                    <MapPin size={14} /> {customer.region || '未知区域'}
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => startEdit(customer)}>
                                        <Edit className="mr-2 h-4 w-4" /> 编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(customer.id)} className="text-red-600">
                                        <Trash className="mr-2 h-4 w-4" /> 删除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
