import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import { Home } from "./pages/Home";
import { ProductView } from "./pages/ProductView";
import { CategoryPage } from "./pages/CategoryPage";
import { BrandPage } from "./pages/BrandPage";
import { Cart } from "./pages/Cart";
import { Account } from "./pages/Account";
import { Profile } from "./pages/account/Profile";
import { Orders } from "./pages/account/Orders";
import { Wishlist } from "./pages/account/Wishlist";
import { Addresses } from "./pages/account/Addresses";
import { Coupons } from "./pages/account/Coupons";
import { Support } from "./pages/Support";
import { OrderDetails } from "./pages/account/OrderDetails";
import { LoyaltyPoints } from "./pages/account/LoyaltyPoints";
import { NotFound } from "./pages/NotFound";
import { SearchResults } from "./pages/SearchResults";

// Info Pages
import { About } from "./pages/info/About";
import { Careers } from "./pages/info/Careers";
import { Press } from "./pages/info/Press";
import { Corporate } from "./pages/info/Corporate";
import { FAQ } from "./pages/info/FAQ";
import { Shipping } from "./pages/info/Shipping";
import { Returns } from "./pages/info/Returns";

// Legal Pages
import { ReturnsPolicy } from "./pages/legal/ReturnsPolicy";
import { Terms } from "./pages/legal/Terms";
import { Privacy } from "./pages/legal/Privacy";
import { Security } from "./pages/legal/Security";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { index: true, Component: Home },
      
      // Info Routes
      { path: "about", Component: About },
      { path: "careers", Component: Careers },
      { path: "press", Component: Press },
      { path: "corporate", Component: Corporate },
      { path: "faq", Component: FAQ },
      { path: "shipping", Component: Shipping },
      { path: "returns", Component: Returns },

      // Legal Routes
      { path: "returns-policy", Component: ReturnsPolicy },
      { path: "terms", Component: Terms },
      { path: "privacy", Component: Privacy },
      { path: "security", Component: Security },

      { path: "product/:id", Component: ProductView },
      { path: "p/:slug", Component: ProductView },
      { path: "category/:category", Component: CategoryPage },
      { path: "brand/:brand", Component: BrandPage },
      { path: "search", Component: SearchResults },
      { path: "cart", Component: Cart },
      {
        path: "account",
        Component: Account,
        children: [
          { index: true, Component: Profile },
          { path: "orders", Component: Orders },
          { path: "loyalty", Component: LoyaltyPoints },
          { path: "coupons", Component: Coupons },
          { path: "wishlist", Component: Wishlist },
          { path: "addresses", Component: Addresses },
        ]
      },
      { path: "orders/:id", Component: OrderDetails },
      { path: "support", Component: Support },
      { path: "*", Component: NotFound },
    ],
  },
]);
