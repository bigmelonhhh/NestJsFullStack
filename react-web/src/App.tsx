import { Navigate, Outlet, useLocation } from "react-router-dom"
import ShopLayout from "./layouts/ShopLayout"
import { useAppSelector } from "./store"

// 路由守卫：未登录跳 /login，已登录用 ShopLayout 包裹子路由
const App = () => {
  const token = useAppSelector((state) => state.auth.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <ShopLayout>
      <Outlet />
    </ShopLayout>
  )
}

export default App
