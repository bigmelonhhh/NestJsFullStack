import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { AxiosError } from "axios"
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Pagination,
  Row,
  Select,
  Spin,
  Tag,
  message,
} from "antd"
import { SearchOutlined, ShoppingCartOutlined } from "@ant-design/icons"
import { productApi } from "../api/ecommerce"
import type { Category, Product } from "../types/ecommerce"
import { formatCurrency } from "../utils/currency"
import { addItem } from "../store/cartSlice"
import { useAppDispatch } from "../store"

const PAGE_SIZE = 12

const ProductList = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState("")
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [categories, setCategories] = useState<Category[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await productApi.list({
        page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        categoryId,
      })
      setProducts(data.items)
      setTotal(data.total)
      // 从已加载商品里累积分类选项（后端无独立分类列表接口）
      // 函数式更新：无新增分类时返回原引用，避免触发额外渲染 → 杜绝无限循环
      setCategories((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        let changed = false
        const next = [...prev]
        data.items.forEach((p) => {
          if (p.category && !seen.has(p.category.id)) {
            seen.add(p.category.id)
            next.push(p.category)
            changed = true
          }
        })
        return changed ? next : prev
      })
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      message.error(err.response?.data?.message || "商品加载失败")
    } finally {
      setLoading(false)
    }
  }, [page, keyword, categoryId])

  useEffect(() => {
    void load()
  }, [load])

  const onAdd = (p: Product) => {
    dispatch(
      addItem({
        productId: p.id,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
      })
    )
    message.success(`已加入购物车：${p.name}`)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索商品"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => setPage(1)}
          allowClear
          onClear={() => setPage(1)}
          className="max-w-xs"
        />
        <Select
          placeholder="全部分类"
          allowClear
          value={categoryId}
          style={{ width: 160 }}
          onChange={(v) => {
            setCategoryId(v)
            setPage(1)
          }}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
        />
        <Button type="primary" onClick={() => setPage(1)}>
          搜索
        </Button>
      </div>

      <Spin spinning={loading}>
        {products.length === 0 && !loading ? (
          <Empty description="暂无商品" className="py-20" />
        ) : (
          <Row gutter={[16, 16]}>
            {products.map((p) => (
              <Col key={p.id} xs={12} sm={8} md={6}>
                <Card
                  hoverable
                  className="product-card"
                  cover={
                    p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-5xl">
                        📦
                      </div>
                    )
                  }
                  onClick={() => navigate(`/products/${p.id}`)}
                  actions={[
                    <ShoppingCartOutlined
                      key="add"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAdd(p)
                      }}
                    />,
                  ]}
                >
                  <Card.Meta
                    title={p.name}
                    description={
                      <div>
                        <div className="text-red-500 font-bold text-lg">
                          {formatCurrency(Number(p.price))}
                        </div>
                        <Tag color={p.stock > 0 ? "green" : "red"}>
                          {p.stock > 0 ? `库存 ${p.stock}` : "已售罄"}
                        </Tag>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <div className="flex justify-end mt-5">
        <Pagination
          current={page}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={(p) => setPage(p)}
          showSizeChanger={false}
        />
      </div>
    </div>
  )
}

export default ProductList
