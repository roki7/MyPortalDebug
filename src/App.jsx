// src/App.jsx (新規作成)
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import MainApp from './MainApp';
import LandingPage from './components/LandingPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* トップページ: LP */}
          <Route path="/" element={<LandingPage />} />
          
          {/* アプリ本体: /app */}
          <Route path="/app" element={<MainApp />} />
          
          {/* その他 */}
          <Route path="/terms" element={<h1>利用規約</h1>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}