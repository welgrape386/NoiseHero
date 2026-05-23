import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from './app/pages/LoginPage';
import { RegisterPage } from './app/pages/RegisterPage';
import { HomePage } from './app/pages/HomePage';
import { MeasurePage } from './app/pages/MeasurePage';
import { ReportPage } from './app/pages/ReportPage';
import { ChatbotPage } from './app/pages/ChatbotPage';
import { MyPage } from './app/pages/MyPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/measure" element={<MeasurePage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}