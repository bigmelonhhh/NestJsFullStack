// 前端数据访问层：集中封装与后端的接口调用
// 对应后端 service/repository 思想 —— 页面只调这里，不直接碰 axios
import client from "./client"
import type { AuthResponse, AuthUser } from "../types/auth"
import type {
  Product,
  Order,
  Paginated,
  ProductQuery,
  OrderQuery,
  CheckoutRequest,
} from "../types/ecommerce"

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    client.post<AuthResponse>("/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    client.post<AuthResponse>("/auth/login", data).then((r) => r.data),
  // 登出：后端将当前 token 的 jti 写入 Redis 黑名单，token 即时失效
  logout: () => client.post("/auth/logout").then((r) => r.data),
  getProfile: () => client.get<AuthUser>("/users/profile").then((r) => r.data),
}

export const productApi = {
  list: (q: ProductQuery = {}) => {
    const params: Record<string, unknown> = {
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 12,
    }
    if (q.categoryId) params.categoryId = q.categoryId
    if (q.keyword) params.keyword = q.keyword
    return client.get<Paginated<Product>>("/products", { params }).then((r) => r.data)
  },
  detail: (id: string) =>
    client.get<Product>(`/products/${id}`).then((r) => r.data),
}

export const orderApi = {
  // 下单：事务内乐观扣库存，库存不足后端返回 422 BUSINESS_ERROR
  checkout: (data: CheckoutRequest) =>
    client.post<Order>("/orders", data).then((r) => r.data),
  list: (q: OrderQuery = {}) => {
    const params: Record<string, unknown> = {
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 10,
    }
    if (q.status) params.status = q.status
    return client.get<Paginated<Order>>("/orders", { params }).then((r) => r.data)
  },
  detail: (id: string) =>
    client.get<Order>(`/orders/${id}`).then((r) => r.data),
}
