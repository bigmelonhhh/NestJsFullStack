import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { AxiosError } from "axios"
import { Button, Card, Spin, Tag, Typography, message } from "antd"
import { orderApi } from "../api/ecommerce"
import type { Order, OrderStatus } from "../types/ecommerce"
import { formatCurrency } from "../utils/currency"
import { formatDateTime } from "../utils/date"

const STATUS_META: Record<OrderStatus, { text: string; color: string }> = {
  PENDING: { text: "待支付", color: "orange" },
  PAID: { text: "已支付", color: "green" },
  SHIPPED: { text: "已发货", color: "blue" },
  DELIVERED: { text: "已送达", color: "cyan" },
  CANCELLED: { text: "已取消", color: "default" },
}

const ORDER_DETAIL = () => {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    orderApi
      .detail(id)
      .then((o) => {
        if (active) setOrder(o)
      })
      .catch((e: AxiosError<{ message?: string }>) => {
        message.error(e.response?.data?.message || "订单加载失败")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    )
  }

  if (!order) {
    return <Typography.Paragraph>订单不存在</Typography.Paragraph>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="m-0">
          订单详情
        </Typography.Title>
        <Tag color={STATUS_META[order.status].color}>
          {STATUS_META[order.status].text}
        </Tag>
      </div>

      <div className="space-y-3">
        {order.items.map((it) => (
          <Card key={it.id} size="small">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center text-xl shrink-0">
                📦
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{it.productName}</div>
                <div className="text-gray-500 text-sm">
                  {formatCurrency(Number(it.price))} × {it.quantity}
                </div>
              </div>
              <div className="font-bold">
                {formatCurrency(Number(it.price) * it.quantity)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mt-5 bg-white p-4 rounded-lg shadow-sm">
        <span className="text-gray-500">
          创建时间：{formatDateTime(order.createdAt)}
        </span>
        <div>
          合计：
          <span className="text-red-500 text-2xl font-bold">
            {formatCurrency(Number(order.totalAmount))}
          </span>
        </div>
      </div>

      <Button className="mt-4" onClick={() => navigate("/orders")}>
        返回订单列表
      </Button>
    </div>
  )
}

export default ORDER_DETAIL
