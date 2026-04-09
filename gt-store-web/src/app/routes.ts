import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { ProductView } from "./pages/ProductView";
import { CategoryPage } from "./pages/CategoryPage";
import { Cart } from "./pages/Cart";
import { Account } from "./pages/Account";
import { Profile } from "./pages/account/Profile";
import { Orders } from "./pages/account/Orders";
import { Wishlist } from "./pages/account/Wishlist";
import { Addresses } from "./pages/account/Addresses";
import { Support } from "./pages/Support";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "product/:id", Component: ProductView },
      { path: "category/:category", Component: CategoryPage },
      { path: "cart", Component: Cart },
      {
        path: "account",
        Component: Account,
        children: [
          { index: true, Component: Profile },
          { path: "orders", Component: Orders },
          { path: "wishlist", Component: Wishlist },
          { path: "addresses", Component: Addresses },
        ],
      },
      { path: "support", Component: Support },
      { path: "*", Component: NotFound },
    ],
  },
]);
