import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppVersionProvider } from "./context/AppVersionContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UrdbListPage } from "./pages/UrdbListPage";
import { UrdbFormPage } from "./pages/UrdbFormPage";
import { GreenDataPage } from "./pages/GreenDataPage";
import { RateEngineDemoPage } from "./pages/RateEngineDemoPage";
import { OtherAttributesPage } from "./pages/OtherAttributesPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { LookupsPage } from "./pages/LookupsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AppUsersPage } from "./pages/AppUsersPage";
import { SurveysPage } from "./pages/SurveysPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { HomepageContentPage } from "./pages/HomepageContentPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppVersionProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/urdb-rates" element={<UrdbListPage />} />
                <Route path="/urdb-rates/new" element={<UrdbFormPage />} />
                <Route path="/urdb-rates/:id" element={<UrdbFormPage />} />
                <Route path="/other-attributes" element={<OtherAttributesPage />} />
                <Route path="/green-data" element={<GreenDataPage />} />
                <Route path="/rate-engine/monthly" element={<RateEngineDemoPage responseType="monthly" />} />
                <Route path="/rate-engine/daily" element={<RateEngineDemoPage responseType="daily" />} />
                <Route path="/lookups" element={<LookupsPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/admin-users" element={<AdminUsersPage />} />
                <Route path="/app-users" element={<AppUsersPage />} />
                <Route path="/surveys" element={<SurveysPage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/homepage-content" element={<HomepageContentPage />} />
              </Route>
            </Route>
          </Routes>
        </AppVersionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
