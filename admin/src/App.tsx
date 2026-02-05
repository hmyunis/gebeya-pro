import { Routes, Route } from "react-router-dom";
import { Providers } from "./providers";
import LoginPage from "./pages/auth/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import ProductsPage from "./pages/products/ProductsPage";
import OrdersPage from "./pages/orders/OrdersPage";
import ActivityLogsPage from "./pages/activity/ActivityLogsPage";
import BankAccountsPage from "./pages/payments/BankAccountsPage";
import ContactMessagesPage from "./pages/contact/ContactMessagesPage";
import AdminProfilePage from "./pages/profile/AdminProfilePage";
import RequireAdmin from "./components/RequireAdmin";

function App() {
  return (
    <Providers>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <RequireAdmin>
              <DashboardLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
          <Route path="bank-accounts" element={<BankAccountsPage />} />
          <Route path="contact-messages" element={<ContactMessagesPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>
      </Routes>
    </Providers>
  );
}

export default App;
