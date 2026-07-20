import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { AxiosError } from "axios"
import {
  Button,
  Descriptions,
  InputNumber,
  Spin,
  Tag,
  Typography,
  message,
} from "antd"
import { ShoppingCartOutlined, InboxOutlined } from "@ant-design/icons"
import { productApi, orderApi } from "../api/ecommerce"
import type { Product } from "../types/ecommerce"
import { formatCurrency } from "../utils/currency"
import { addItem } from "../store/cartSlice"
import { useAppDispatch } from "../store"

const ProductDetail = () => {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    let active = true
    setLoading(true)
    productApi
      .detail(id)
      .then((p) => {
        if (active) setProduct(p)
      })
      .catch((e: AxiosError<{ message?: string }>) => {
        message.error(e.response?.data?.message || "商品加载失败")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const onAdd = () => {
    if (!product) return
    dispatch(
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity,
      })
    )
    message.success(`已加入购物车：${product.name} × ${quantity}`)
  }

  // 立即购买：直接下单该商品，验证后端下单接口 + 防超卖
  const onBuyNow = async () => {
    if (!product) return
    setBuying(true)
    try {
      const order = await orderApi.checkout({
        items: [{ productId: product.id, quantity }],
      })
      message.success("下单成功")
      navigate(`/orders/${order.id}`)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      message.error(err.response?.data?.message || "下单失败")
    } finally {
      setBuying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    )
  }

  if (!product) {
    return <Typography.Paragraph>商品不存在</Typography.Paragraph>
  }

  return (
    <div className="glass-card p-8 flex flex-col md:flex-row gap-10">
      <div className="md:w-1/2">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full rounded-xl object-cover"
          />
        ) : (
          <div className="h-80 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center">
            <InboxOutlined style={{ fontSize: 64, color: "#A8A29E" }} />
          </div>
        )}
      </div>
      <div className="md:w-1/2 flex flex-col">
        <h2 className="font-heading text-3xl font-semibold text-dark m-0">
          {product.name}
        </h2>
        <div className="text-cta font-bold text-3xl my-4 font-body">
          {formatCurrency(Number(product.price))}
        </div>
        <Tag color={product.stock > 0 ? "gold" : "default"} className="w-fit">
          {product.stock > 0 ? `库存 ${product.stock}` : "已售罄"}
        </Tag>
        <Descriptions column={1} className="my-5" size="small">
          <Descriptions.Item label="分类">
            {product.category?.name || "未分类"}
          </Descriptions.Item>
          <Descriptions.Item label="描述">
            {product.description || "暂无描述"}
          </Descriptions.Item>
        </Descriptions>

        <div className="flex items-center gap-4 mt-auto">
          <span className="text-secondary font-body text-sm">数量</span>
          <InputNumber
            min={1}
            max={product.stock > 0 ? product.stock : 1}
            value={quantity}
            onChange={(v) => setQuantity(v ?? 1)}
          />
        </div>
        <div className="flex gap-3 mt-6">
          <Button
            icon={<ShoppingCartOutlined />}
            size="large"
            onClick={onAdd}
            disabled={product.stock <= 0}
            className="rounded-lg"
          >
            加入购物车
          </Button>
          <Button
            type="primary"
            size="large"
            loading={buying}
            onClick={onBuyNow}
            disabled={product.stock <= 0}
            className="rounded-lg"
          >
            立即购买
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
