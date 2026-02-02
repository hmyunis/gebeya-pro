import { Routes, Route } from "react-router-dom";
import { Providers } from "./providers";
import LoginPage from "./pages/auth/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";

function App() {
  return (
    <Providers>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          {/* We will add Products/Orders routes here later */}
        </Route>
      </Routes>
    </Providers>
  );
}

export default App;
