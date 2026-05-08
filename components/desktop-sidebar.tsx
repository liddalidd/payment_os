'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Package,
    ShoppingCart,
    BarChart3,
    Users,
    Settings,
    ClipboardList,
    Building2,
    Truck,
    LayoutDashboard,
    Wallet,
    HandCoins,
    Box,
    Calculator,
    ChevronDown,
    ChevronRight,
    Store
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
    href: string
    icon: any
    label: string
}

interface NavGroup {
    label: string
    icon: any
    items: NavItem[]
}

export function DesktopSidebar() {
    const pathname = usePathname()
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        '经营总览': true,
        '销售与客户': true,
        '供应链管理': true,
        '财务账目': false
    })

    const navGroups: NavGroup[] = [
        {
            label: '经营总览',
            icon: LayoutDashboard,
            items: [
                { href: '/', icon: Home, label: '门店现状' },
                { href: '/analytics', icon: BarChart3, label: '生意报表' },
            ]
        },
        {
            label: '销售与客户',
            icon: Store,
            items: [
                { href: '/pos', icon: ShoppingCart, label: '门店收银' },
                { href: '/orders', icon: ClipboardList, label: '销售记录' },
                { href: '/customers', icon: Users, label: '客户档案' },
            ]
        },
        {
            label: '供应链管理',
            icon: Truck,
            items: [
                { href: '/purchase', icon: Truck, label: '采购入库' },
                { href: '/purchase/records', icon: ClipboardList, label: '进货记录' },
                { href: '/inventory', icon: Package, label: '商品库存' },
                { href: '/suppliers', icon: Building2, label: '合作伙伴' },
            ]
        },
        {
            label: '财务账目',
            icon: Wallet,
            items: [
                { href: '/finance', icon: LayoutDashboard, label: '财务概况' },
                { href: '/finance/ledger', icon: Wallet, label: '收支流水' },
                { href: '/finance/accounts', icon: HandCoins, label: '欠款管理' },
                { href: '/finance/assets', icon: Box, label: '店铺资产' },
                { href: '/finance/costing', icon: Calculator, label: '利润核算' },
            ]
        },
    ]

    // 自动展开包含当前活动的 Group
    useEffect(() => {
        navGroups.forEach(group => {
            if (group.items.some(item => pathname === item.href)) {
                setExpandedGroups(prev => ({ ...prev, [group.label]: true }))
            }
        })
    }, [pathname])

    const toggleGroup = (label: string) => {
        setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }))
    }

    return (
        <div className="hidden md:flex flex-col w-64 border-r bg-card h-screen overflow-y-auto no-scrollbar">
            <div className="flex items-center gap-2 px-6 py-8">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
                    S
                </div>
                <span className="text-xl font-bold tracking-tight">SmartPOS</span>
            </div>

            <nav className="flex-1 px-4 space-y-2 pb-8">
                {navGroups.map((group) => {
                    const GroupIcon = group.icon
                    const isExpanded = expandedGroups[group.label]

                    return (
                        <div key={group.label} className="space-y-1">
                            <button
                                onClick={() => toggleGroup(group.label)}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <GroupIcon size={14} className="group-hover:text-primary transition-colors" />
                                    <span>{group.label}</span>
                                </div>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            {isExpanded && (
                                <div className="space-y-1 ml-2 border-l border-muted/50 pl-2">
                                    {group.items.map((item) => {
                                        const Icon = item.icon
                                        const isActive = pathname === item.href
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                                                    isActive
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                                )}
                                            >
                                                <Icon
                                                    size={18}
                                                    className={cn(
                                                        "transition-transform group-hover:scale-110",
                                                        isActive ? "text-primary" : "text-muted-foreground"
                                                    )}
                                                />
                                                <span>{item.label}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>

            <div className="mx-4 mb-4">
                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all group"
                    )}
                >
                    <Settings size={18} className="group-hover:rotate-45 transition-transform" />
                    <span>系统设置</span>
                </Link>
            </div>
        </div>
    )
}
