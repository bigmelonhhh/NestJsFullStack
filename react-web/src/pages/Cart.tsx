import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { AxiosError } from "axios"
import { Button, Card, Empty, InputNumber, message } from "antd"
import { DeleteOutlined, InboxOutlined } from "@ant-design/icons"
import { orderApi } from "../api/ecommerce"
import { clearCart, removeItem, updateQty } from "../store/cartSlice"
import type { CartItem } from "../store/cartSlice"
import { useAppDispatch, useAppSelector } from "../store"
import { formatCurrency } from "../utils/currency"

const Cart = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.cart.items)
  const [checking, setChecking] = useState(false)

  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)

  const onCheckout = async () => {
    if (items.length === 0) return
    setChecking(true)
    try {
      const order = await orderApi.checkout({
        items: items.map((i: CartItem) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      })
      dispatch(clearCart())
      message.success("下单成功")
      navigate(`/orders/${order.id}`)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      message.error(err.response?.data?.message || "下单失败")
    } finally {
      setChecking(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <Empty description="购物车是空的" />
        <Button type="primary" className="mt-4 rounded-lg" onClick={() => navigate("/")}>
          去逛逛
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-dark mt-0 mb-5">
        购物车
      </h2>
      <div className="space-y-3">
        {items.map((i) => (
          <Card key={i.productId} size="small" className="rounded-xl border-white/30">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-lg flex items-center justify-center shrink-0">
                <InboxOutlined style={{ fontSize: 24, color: "#A8A29E" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium font-body text-sm text-dark truncate">{i.name}</div>
                <div className="text-cta font-body">{formatCurrency(Number(i.price))}</div>
              </div>
              <InputNumber
                min={1}
                value={i.quantity}
                onChange={(v) =>
                  dispatch(
                    updateQty({ productId: i.productId, quantity: v ?? 1 })
                  )
                }
              />
              <div className="w-24 text-right font-bold font-body text-dark">
                {formatCurrency(Number(i.price) * i.quantity)}
              </div>
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                className="cursor-pointer"
                onClick={() => dispatch(removeItem(i.productId))}
              />
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6 glass-card p-5">
        <div className="font-body text-dark">
          合计：
          <span className="text-cta text-2xl font-bold ml-1">
            {formatCurrency(total)}
          </span>
        </div>
        <Button type="primary" size="large" loading={checking} onClick={onCheckout} className="rounded-lg">
          结算下单
        </Button>
      </div>
    </div>
  )
}

export default Cart
