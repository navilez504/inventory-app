import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import AssetsListPage from "../pages/AssetsListPage";
import AssetFormPage from "../pages/AssetFormPage";
import WarehousesPage from "../pages/WarehousesPage";
import MovementsPage from "../pages/MovementsPage";
import AuditLogsPage from "../pages/AuditLogsPage";
import ReportsPage from "../pages/ReportsPage";
import AssignmentsPage from "../pages/AssignmentsPage";
import UsersPage from "../pages/UsersPage";
import RolesPage from "../pages/RolesPage";
import MasterDataPage from "../pages/MasterDataPage";
import OrganizationPage from "../pages/OrganizationPage";
import StockPage from "../pages/StockPage";
import { ProtectedRoute } from "../services/ProtectedRoute";

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="assets" element={<AssetsListPage />} />
      <Route path="assets/new" element={<AssetFormPage />} />
      <Route path="assets/:id" element={<AssetFormPage />} />
      <Route path="warehouses" element={<WarehousesPage />} />
      <Route path="stock" element={<StockPage />} />
      <Route path="organization" element={<OrganizationPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="roles" element={<RolesPage />} />
      <Route path="master-data" element={<MasterDataPage />} />
      <Route path="assignments" element={<AssignmentsPage />} />
      <Route path="movements" element={<MovementsPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="audit" element={<AuditLogsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;

