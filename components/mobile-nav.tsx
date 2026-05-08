'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    ShoppingCart,
    ClipboardList,
    Truck,
    MoreHorizontal,
    Package,
    Users,
    Building2,
    BarChart3,
    Settings,
    Wallet,
    X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function MobileNav() {
    const pathname = usePathname()
    const [showMore, setShowMore] = useState(false)

    const mainItems = [
        { href: '/', icon: Home, label: '概览' },
        { href: '/pos', icon: ShoppingCart, label: '收银' },
        { href: '/purchase', icon: Truck, label: '进货' },
        { href: '/orders', icon: ClipboardList, label: '订单' },
    ]

    const otherGroups = [
        {
            title: '管理',
            items: [
                { href: '/inventory', icon: Package, label: '库存查询' },
                { href: '/customers', icon: Users, label: '客户档案' },
                { href: '/suppliers', icon: Building2, label: '合作伙伴' },
                { href: '/analytics', icon: BarChart3, label: '经营分析' },
            ]
        },
        {
            title: '财务',
            items: [
                { href: '/finance', icon: Wallet, label: '财务概况' },
                { href: '/finance/ledger', icon: Wallet, label: '收支流水' },
                { href: '/finance/accounts', icon: Wallet, label: '欠款管理' },
            ]
        }
    ]

    return (
        <>
            {/* Full Screen Menu Tray - when more is clicked */}
            {showMore && (
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex flex-col h-full p-6">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold">全部功能</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowMore(false)}>
                                <X size={24} />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-8">
                            {otherGroups.map(group => (
                                <div key={group.title} className="space-y-4">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {group.items.map(item => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setShowMore(false)}
                                                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary/50 active:scale-95 transition-all"
                                            >
                                                <item.icon size={24} className="text-primary" />
                                                <span className="text-xs font-medium">{item.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 border-t">
                                <Link
                                    href="/settings"
                                    onClick={() => setShowMore(false)}
                                    className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50"
                                >
                                    <Settings size={20} />
                                    <span className="font-medium">系统设置</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav Bar */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg p-2 md:hidden z-40">
                <div className="flex justify-around items-center">
                    {mainItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center space-y-1 w-full p-2 rounded-xl transition-all",
                                    isActive ? "text-primary bg-primary/5" : "text-muted-foreground"
                                )}
                            >
                                <Icon size={20} className={isActive ? "scale-110" : ""} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                    <button
                        onClick={() => setShowMore(true)}
                        className="flex flex-col items-center justify-center space-y-1 w-full p-2 text-muted-foreground"
                    >
                        <MoreHorizontal size={20} />
                        <span className="text-[10px] font-medium">更多</span>
                    </button>
                </div>
            </div>
        </>
    )
}
