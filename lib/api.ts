export class ApiError extends Error {
  code?: string
  status?: number
  constructor(message: string, opts?: { code?: string; status?: number }) {
    super(message)
    this.code = opts?.code
    this.status = opts?.status
  }
}

export type ApiResult<T> = { data: T | null; error: ApiError | null }

async function request<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let payload: any = null
    if (text) {
      try { payload = JSON.parse(text) } catch { payload = { message: text } }
    }
    if (!res.ok) {
      return {
        data: null,
        error: new ApiError(payload?.message || `HTTP ${res.status}`, {
          code: payload?.error,
          status: res.status,
        }),
      }
    }
    return { data: payload as T, error: null }
  } catch (e: any) {
    return { data: null, error: new ApiError(e?.message ?? String(e)) }
  }
}

const get = <T>(url: string) => request<T>('GET', url)
const post = <T>(url: string, body: unknown) => request<T>('POST', url, body)
const patch = <T>(url: string, body: unknown) => request<T>('PATCH', url, body)
const del = <T>(url: string) => request<T>('DELETE', url)

export const api = {
  products: {
    list: () => get<any[]>('/api/products'),
    create: (data: Record<string, unknown>) => post<any>('/api/products', data),
    update: (id: string, data: Record<string, unknown>) => patch<any>(`/api/products/${id}`, data),
    remove: (id: string) => del<{ ok: true }>(`/api/products/${id}`),
  },
  customers: {
    list: () => get<any[]>('/api/customers'),
    create: (data: Record<string, unknown>) => post<any>('/api/customers', data),
    update: (id: string, data: Record<string, unknown>) => patch<any>(`/api/customers/${id}`, data),
    remove: (id: string) => del<{ ok: true }>(`/api/customers/${id}`),
  },
  suppliers: {
    list: () => get<any[]>('/api/suppliers'),
    create: (data: Record<string, unknown>) => post<any>('/api/suppliers', data),
    update: (id: string, data: Record<string, unknown>) => patch<any>(`/api/suppliers/${id}`, data),
    remove: (id: string) => del<{ ok: true }>(`/api/suppliers/${id}`),
  },
  orders: {
    list: () => get<any[]>('/api/orders'),
    create: (payload: {
      customer_id: string | null
      payment_method: string
      total_amount: number
      discount_amount: number
      type: 'retail' | 'wholesale'
      items: Array<{
        product_id: string
        quantity: number
        price_at_sale: number
        original_price: number
        cost_at_sale: number
      }>
    }) => post<{ id: string }>('/api/orders', payload),
    updateStatus: (id: string, payload: { status: string; currentStatus: string }) =>
      patch<any>(`/api/orders/${id}`, payload),
    remove: (id: string) => del<{ ok: true }>(`/api/orders/${id}`),
  },
  purchaseOrders: {
    list: () => get<any[]>('/api/purchase-orders'),
    create: (payload: {
      supplier_id: string
      shipping_fee: number
      other_costs: number
      items: Array<{
        productId: string | null
        isNew: boolean
        name: string
        barcode: string
        unit: string
        quantity: number
        price: number
        retailPrice: number
        originalStock: number
        originalCost: number
        allocatedCost: number
      }>
    }) => post<{ id: string }>('/api/purchase-orders', payload),
    updateStatus: (
      id: string,
      payload: { type: 'inbound' | 'outbound'; payment_status: 'paid' | 'unpaid' },
    ) => patch<any>(`/api/purchase-orders/${id}`, payload),
  },
  transactions: {
    list: (from?: string) => get<any[]>(`/api/transactions${from ? `?from=${encodeURIComponent(from)}` : ''}`),
  },
  dashboard: (daysRange: number) => get<{
    todayRevenue: number
    monthOrderCount: number
    lowStockCount: number
    totalCustomers: number
    revenueHistory: Array<{ name: string; amount: number }>
  }>(`/api/dashboard?days=${daysRange}`),
  analytics: (days: number) => get<{
    orders: any[]
    items: any[]
  }>(`/api/analytics?days=${days}`),
  upload: async (file: File): Promise<ApiResult<{ url: string }>> => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const text = await res.text()
        return { data: null, error: new ApiError(text || `HTTP ${res.status}`, { status: res.status }) }
      }
      return { data: (await res.json()) as { url: string }, error: null }
    } catch (e: any) {
      return { data: null, error: new ApiError(e?.message ?? String(e)) }
    }
  },
}
