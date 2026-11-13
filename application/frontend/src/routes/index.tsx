import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { ProtectedRoute, PublicOnlyRoute } from "../components/layout/ProtectedRoute";
import { DashboardPage } from "../pages/DashboardPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { ProjectDetailsPage } from "../pages/ProjectDetailsPage";
import { KanbanPage } from "../pages/KanbanPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProfilePage } from "../pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "projects",
        element: (
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "projects/:projectId",
        element: (
          <ProtectedRoute>
            <ProjectDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "projects/:projectId/kanban",
        element: (
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "kanban",
        element: (
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "login",
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: "register",
        element: (
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
