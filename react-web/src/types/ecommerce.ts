// 与 NestJS 后端 products/orders 模块对齐的电商类型
// 注意：金额字段(price/totalAmount)后端为 Decimal，JSON 序列化为字符串，前端用 Number() 转换

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"

export type Category = {
  id: string
  name: string
  description?: string | null
}

export type Product = {
  id: string
  name: string
  description?: string | null
  price: string // Decimal → 字符串
  stock: number
  imageUrl?: string | null
  categoryId: string
  category?: Category | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type OrderItem = {
  id: string
  orderId: string
  productId: string
  quantity: number
  price: string // 下单时快照单价，字符串
  productName: string
  productImage?: string | null
}

export type Order = {
  id: string
  userId: string
  status: OrderStatus
  totalAmount: string // 字符串
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type ProductQuery = {
  page?: number
  pageSize?: number
  categoryId?: string
  keyword?: string
}

export type OrderQuery = {
  page?: number
  pageSize?: number
  status?: OrderStatus
}

export type CheckoutItem = {
  productId: string
  quantity: number
}

export type CheckoutRequest = {
  items: CheckoutItem[]
}
