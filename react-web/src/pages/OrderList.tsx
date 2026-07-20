import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { AxiosError } from "axios"
import { Button, Empty, Spin, Table, Tag, message } from "antd"
import type { TableColumnsType } from "antd"
import { orderApi } from "../api/ecommerce"
import type { Order, OrderStatus } from "../types/ecommerce"
import { formatCurrency } from "../utils/currency"
import { formatDateTime } from "../utils/date"

const STATUS_META: Record<OrderStatus, { text: string; color: string }> = {
  PENDING: { text: "待支付", color: "gold" },
  PAID: { text: "已支付", color: "green" },
  SHIPPED: { text: "已发货", color: "blue" },
  DELIVERED: { text: "已送达", color: "cyan" },
  CANCELLED: { text: "已取消", color: "default" },
}

const PAGE_SIZE = 10

const OrderList = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orderApi.list({ page, pageSize: PAGE_SIZE })
      setOrders(data.items)
      setTotal(data.total)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      message.error(err.response?.data?.message || "订单加载失败")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  const columns: TableColumnsType<Order> = [
    {
      title: "订单号",
      dataIndex: "id",
      render: (id: string) => <span className="font-mono text-xs">{id.slice(0, 8)}…</span>,
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (s: OrderStatus) => (
        <Tag color={STATUS_META[s].color}>{STATUS_META[s].text}</Tag>
      ),
    },
    {
      title: "商品数",
      render: (_, o) => o.items.reduce((n, i) => n + i.quantity, 0),
    },
    {
      title: "金额",
      dataIndex: "totalAmount",
      render: (v: string) => formatCurrency(Number(v)),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "操作",
      render: (_, o) => (
        <Button type="link" onClick={() => navigate(`/orders/${o.id}`)}>
          查看
        </Button>
      ),
    },
  ]

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-dark mt-0 mb-5">
        我的订单
      </h2>
      <Spin spinning={loading}>
        {orders.length === 0 && !loading ? (
          <Empty description="暂无订单" className="py-20" />
        ) : (
          <Table
            rowKey="id"
            dataSource={orders}
            columns={columns}
            className="glass-card overflow-hidden rounded-xl"
            pagination={{
              current: page,
              total,
              pageSize: PAGE_SIZE,
              showSizeChanger: false,
              onChange: (p) => setPage(p),
            }}
          />
        )}
      </Spin>
    </div>
  )
}

export default OrderList
