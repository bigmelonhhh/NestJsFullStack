import axios from "axios"
import { message } from "antd"

// 前端数据访问基座：对接 NestJS 后端（vite dev 下经 /api 代理到 localhost:3000）
const client = axios.create({
  baseURL: import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// 请求拦截器：自动附加 JWT
client.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || ""
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理 401（token 失效）与其他错误提示
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      // token 失效：清本地凭证并跳登录
      localStorage.removeItem("auth_token")
      localStorage.removeItem("auth_user")
      sessionStorage.removeItem("auth_token")
      if (!window.location.pathname.includes("/login")) {
        message.error("登录已过期，请重新登录")
        window.location.assign("/login")
      }
    }
    return Promise.reject(error)
  }
)

export default client
