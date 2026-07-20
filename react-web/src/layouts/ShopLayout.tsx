import type { PropsWithChildren } from "react"
import { useNavigate } from "react-router-dom"
import { Avatar, Badge, Dropdown, Layout, Space, Typography } from "antd"
import { LogoutOutlined, ShoppingCartOutlined, UserOutlined } from "@ant-design/icons"
import { useAppDispatch, useAppSelector } from "../store"
import { clearAuth } from "../store/authSlice"
import { authApi } from "../api/ecommerce"

// 受保护布局：顶部导航 + 购物车角标 + 用户菜单
const ShopLayout = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const cartCount = useAppSelector((s) =>
    s.cart.items.reduce((n, i) => n + i.quantity, 0)
  )

  // 登出：先通知后端写黑名单（token 即时失效），再清前端状态
  // 即使后端返回 401（token 已过期），前端也照常退出
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
    <Layout className="min-h-screen bg-gray-50">
      <Layout.Header className="flex items-center justify-between bg-white px-6 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <Typography.Text
            strong
            className="text-lg text-blue-600 cursor-pointer"
            onClick={() => navigate("/")}
          >
            🛒 电商 Demo
          </Typography.Text>
          <Space size="large">
            <span
              className="cursor-pointer text-gray-700 hover:text-blue-600"
              onClick={() => navigate("/")}
            >
              首页
            </span>
            <span
              className="cursor-pointer text-gray-700 hover:text-blue-600"
              onClick={() => navigate("/orders")}
            >
              我的订单
            </span>
          </Space>
        </div>
        <Space size="middle">
          <Badge count={cartCount} size="small">
            <ShoppingCartOutlined
              style={{ fontSize: 22 }}
              className="cursor-pointer text-gray-700"
              onClick={() => navigate("/cart")}
            />
          </Badge>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space className="cursor-pointer">
              <Avatar size={32} style={{ backgroundColor: "#1677ff" }}>
                {user?.name?.[0] || <UserOutlined />}
              </Avatar>
              <span className="text-gray-700">{user?.name || user?.email}</span>
            </Space>
          </Dropdown>
        </Space>
      </Layout.Header>
      <Layout.Content className="p-6 mx-auto w-full max-w-6xl">{children}</Layout.Content>
    </Layout>
  )
}

export default ShopLayout
