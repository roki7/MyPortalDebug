import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import MainApp from "./MainApp";
import LandingPage from "./components/LandingPage";

function RequireAuth({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const location = useLocation();

  if (location.pathname.startsWith("/__/auth")) {
    return null;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <MainApp />
          </RequireAuth>
        }
      />
      <Route path="/terms" element={<h1>利用規約</h1>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
