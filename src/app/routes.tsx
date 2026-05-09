import { createBrowserRouter, Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { MeasurePage } from './pages/MeasurePage';
import { ReportPage } from './pages/ReportPage';
import { ChatbotPage } from './pages/ChatbotPage';
import { MyPage } from './pages/MyPage';

function RequireAuth({ children }: { children: ReactNode }) {
  // noise_token: JWT 액세스 토큰 (로그인/회원가입 성공 시 저장)
  const token = localStorage.getItem('noise_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/home',
    element: <RequireAuth><HomePage /></RequireAuth>,
  },
  {
    path: '/measure',
    element: <RequireAuth><MeasurePage /></RequireAuth>,
  },
  {
    path: '/report',
    element: <RequireAuth><ReportPage /></RequireAuth>,
  },
  {
    path: '/chatbot',
    element: <RequireAuth><ChatbotPage /></RequireAuth>,
  },
  {
    path: '/mypage',
    element: <RequireAuth><MyPage /></RequireAuth>,
  },
  { path: '*', element: <Navigate to="/home" replace /> },
]);