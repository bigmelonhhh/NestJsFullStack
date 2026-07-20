import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type CartItem = {
  productId: string
  name: string
  price: string // 字符串，与后端一致
  imageUrl?: string | null
  quantity: number
}

type CartState = {
  items: CartItem[]
}

const STORAGE_KEY = "ecom_cart"

const loadCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

const persist = (items: CartItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

const initialState: CartState = { items: loadCart() }

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (
      state,
      action: PayloadAction<{
        productId: string
        name: string
        price: string
        imageUrl?: string | null
        quantity?: number
      }>
    ) => {
      const { productId, quantity = 1, ...rest } = action.payload
      const existing = state.items.find((i) => i.productId === productId)
      if (existing) {
        existing.quantity += quantity
      } else {
        state.items.push({ productId, quantity, ...rest })
      }
      persist(state.items)
    },
    updateQty: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>
    ) => {
      const item = state.items.find((i) => i.productId === action.payload.productId)
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity)
        persist(state.items)
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload)
      persist(state.items)
    },
    clearCart: (state) => {
      state.items = []
      persist(state.items)
    },
  },
})

export const { addItem, updateQty, removeItem, clearCart } = cartSlice.actions
export default cartSlice.reducer
