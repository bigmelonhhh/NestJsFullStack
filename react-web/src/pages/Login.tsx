import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { AxiosError } from "axios"
import { Button, Form, Input, Tabs, message } from "antd"
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons"
import { authApi } from "../api/ecommerce"
import { setAuth } from "../store/authSlice"
import { useAppDispatch } from "../store"

type LoginValues = { email: string; password: string }
type RegisterValues = LoginValues & { name: string }

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const [form] = Form.useForm()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/"

  const fillDemo = () => {
    setMode("login")
    form.setFieldsValue({ email: "user@demo.com", password: "123456" })
  }

  const onFinish = async (values: LoginValues | RegisterValues) => {
    setLoading(true)
    try {
      const data =
        mode === "login"
          ? await authApi.login({ email: values.email, password: values.password })
          : await authApi.register({
              email: values.email,
              name: (values as RegisterValues).name,
              password: values.password,
            })
      dispatch(
        setAuth({ token: data.accessToken, user: data.user, remember: true })
      )
      message.success(mode === "login" ? "登录成功" : "注册成功")
      navigate(from, { replace: true })
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      message.error(err.response?.data?.message || (mode === "login" ? "登录失败" : "注册失败"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary relative overflow-hidden">
      {/* 背景装饰光晕 */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cta/10 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-cta/5 blur-3xl" />

      <div className="w-full max-w-md glass-card p-10 animate-fade-in-up relative z-10">
        <h1 className="font-heading text-3xl font-semibold text-center text-dark m-0 tracking-wide">
          LUXE STORE
        </h1>
        <p className="text-center text-secondary font-body text-sm mt-2 mb-6">
          Premium E-Commerce Experience
        </p>

        <Tabs
          activeKey={mode}
          onChange={(k) => setMode(k as "login" | "register")}
          items={[
            { key: "login", label: "登录" },
            { key: "register", label: "注册" },
          ]}
          centered
        />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
          </Form.Item>
          {mode === "register" && (
            <Form.Item name="name" rules={[{ required: true, message: "请输入昵称" }]}>
              <Input prefix={<UserOutlined />} placeholder="昵称" size="large" />
            </Form.Item>
          )}
          <Form.Item
            name="password"
            rules={[{ required: true, min: 6, message: "密码至少 6 位" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
          >
            {mode === "login" ? "登录" : "注册"}
          </Button>
        </Form>

        <Button type="link" block onClick={fillDemo} className="mt-2 text-secondary hover:text-cta transition-colors duration-200">
          一键填充演示账号（user@demo.com / 123456）
        </Button>
      </div>
    </div>
  )
}

export default Login
