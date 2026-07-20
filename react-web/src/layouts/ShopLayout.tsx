import type { PropsWithChildren } from "react"
import { useNavigate } from "react-router-dom"
import { Avatar, Badge, Dropdown, Layout, Space } from "antd"
import { LogoutOutlined, ShoppingCartOutlined, UserOutlined } from "@ant-design/icons"
import { useAppDispatch, useAppSelector } from "../store"
import { clearAuth } from "../store/authSlice"
import { authApi } from "../api/ecommerce"

// 受保护布局：玻璃导航栏 + 购物车角标 + 用户菜单
const ShopLayout = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const cartCount = useAppSelector((s) =>
    s.cart.items.reduce((n, i) => n + i.quantity, 0)
  )

  const onLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // token 已失效也无所谓，前端照样退出
    } finally {
      dispatch(clearAuth())
      navigate("/login", { replace: true })
    }
  }

  const userMenu = {
    items: [
      { key: "name", label: user?.name || user?.email, disabled: true },
      { type: "divider" as const },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "退出登录",
        danger: true,
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === "logout") onLogout()
    },
  }

  return (
    <Layout className="min-h-screen bg-surface">
      <Layout.Header
        className="flex items-center justify-between px-8 sticky top-0 z-10 border-b border-white/20"
        style={{
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
        }}
      >
        <div className="flex items-center gap-8">
          <span
            className="font-heading text-xl font-semibold text-primary cursor-pointer tracking-wide transition-colors duration-200 hover:text-cta"
            onClick={() => navigate("/")}
          >
            LUXE STORE
          </span>
          <Space size="large">
            <span
              className="cursor-pointer text-secondary hover:text-cta transition-colors duration-200 font-body text-sm font-medium"
              onClick={() => navigate("/")}
            >
              首页
            </span>
            <span
              className="cursor-pointer text-secondary hover:text-cta transition-colors duration-200 font-body text-sm font-medium"
              onClick={() => navigate("/orders")}
            >
              我的订单
            </span>
          </Space>
        </div>
        <Space size="middle">
          <Badge count={cartCount} size="small" color="#CA8A04">
            <ShoppingCartOutlined
              style={{ fontSize: 20 }}
              className="cursor-pointer text-secondary hover:text-cta transition-colors duration-200"
              onClick={() => navigate("/cart")}
            />
          </Badge>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space className="cursor-pointer group">
              <Avatar
                size={32}
                style={{ backgroundColor: "#1C1917" }}
              >
                {user?.name?.[0] || <UserOutlined />}
              </Avatar>
              <span className="text-secondary group-hover:text-cta transition-colors duration-200 font-body text-sm">
                {user?.name || user?.email}
              </span>
            </Space>
          </Dropdown>
        </Space>
      </Layout.Header>
      <Layout.Content className="p-6 mx-auto w-full max-w-6xl">{children}</Layout.Content>
    </Layout>
  )
}

export default ShopLayout
