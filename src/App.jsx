// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import MainApp from "./MainApp";
import LandingPage from "./components/LandingPage";

function AppRoutes() {
  const location = useLocation();

  // Firebase Auth の内部URLはReact Routerに処理させない
  if (location.pathname.startsWith("/__/auth")) return null;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<MainApp />} />
      <Route path="/terms" element={<h1>利用規約</h1>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* <AuthProvider> */}
      <AppRoutes />
      {/* </AuthProvider> */}
    </BrowserRouter>
  );
}
