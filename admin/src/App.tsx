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
import MerchantsPage from "./pages/merchants/MerchantsPage";
import AnnouncementsPage from "./pages/announcements/AnnouncementsPage";
import CustomersPage from "./pages/customers/CustomersPage";

function App() {
  return (
    <Providers>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <RequireAdmin allowedRoles={["admin", "merchant"]}>
              <DashboardLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
          <Route
            path="activity-logs"
            element={
              <RequireAdmin allowedRoles={["admin"]}>
                <ActivityLogsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="bank-accounts"
            element={
              <RequireAdmin allowedRoles={["admin", "merchant"]}>
                <BankAccountsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="contact-messages"
            element={
              <RequireAdmin allowedRoles={["admin"]}>
                <ContactMessagesPage />
              </RequireAdmin>
            }
          />
          <Route
            path="merchants"
            element={
              <RequireAdmin allowedRoles={["admin"]}>
                <MerchantsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="customers"
            element={
              <RequireAdmin allowedRoles={["admin"]}>
                <CustomersPage />
              </RequireAdmin>
            }
          />
          <Route
            path="announcements"
            element={
              <RequireAdmin allowedRoles={["admin"]}>
                <AnnouncementsPage />
              </RequireAdmin>
            }
          />
        </Route>
      </Routes>
    </Providers>
  );
}

export default App;
