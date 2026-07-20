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
import { ShoppingCartOutlined } from "@ant-design/icons"
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
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col md:flex-row gap-8">
      <div className="md:w-1/2">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full rounded-lg object-cover"
          />
        ) : (
          <div className="h-80 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-8xl">
            📦
          </div>
        )}
      </div>
      <div className="md:w-1/2 flex flex-col">
        <Typography.Title level={3}>{product.name}</Typography.Title>
        <div className="text-red-500 font-bold text-3xl my-3">
          {formatCurrency(Number(product.price))}
        </div>
        <Tag color={product.stock > 0 ? "green" : "red"} className="w-fit">
          {product.stock > 0 ? `库存 ${product.stock}` : "已售罄"}
        </Tag>
        <Descriptions column={1} className="my-4" size="small">
          <Descriptions.Item label="分类">
            {product.category?.name || "未分类"}
          </Descriptions.Item>
          <Descriptions.Item label="描述">
            {product.description || "暂无描述"}
          </Descriptions.Item>
        </Descriptions>

        <div className="flex items-center gap-4 mt-auto">
          <span className="text-gray-600">数量</span>
          <InputNumber
            min={1}
            max={product.stock > 0 ? product.stock : 1}
            value={quantity}
            onChange={(v) => setQuantity(v ?? 1)}
          />
        </div>
        <div className="flex gap-3 mt-5">
          <Button
            icon={<ShoppingCartOutlined />}
            size="large"
            onClick={onAdd}
            disabled={product.stock <= 0}
          >
            加入购物车
          </Button>
          <Button
            type="primary"
            size="large"
            loading={buying}
            onClick={onBuyNow}
            disabled={product.stock <= 0}
          >
            立即购买
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
