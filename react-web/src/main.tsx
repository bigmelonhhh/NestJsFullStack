import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { Provider } from "react-redux"
import { ConfigProvider } from "antd"
import "antd/dist/reset.css"
import "./index.css"
import App from "./App"
import Login from "./pages/Login"
import ProductList from "./pages/ProductList"
import ProductDetail from "./pages/ProductDetail"
import Cart from "./pages/Cart"
import OrderList from "./pages/OrderList"
import OrderDetail from "./pages/OrderDetail"
import { store } from "./store"

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <ProductList /> },
      { path: "products/:id", element: <ProductDetail /> },
      { path: "cart", element: <Cart /> },
      { path: "orders", element: <OrderList /> },
      { path: "orders/:id", element: <OrderDetail /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#CA8A04",
            colorBgContainer: "#FFFFFF",
            colorBgLayout: "#FAFAF9",
            colorText: "#0C0A09",
            colorTextSecondary: "#44403C",
            borderRadius: 12,
            fontFamily: "Montserrat, sans-serif",
          },
        }}
      >
        <RouterProvider router={router} />
      </ConfigProvider>
    </Provider>
  </StrictMode>
)
