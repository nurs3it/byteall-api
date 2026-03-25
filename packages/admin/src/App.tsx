import { Refine, Authenticated } from '@refinedev/core';
import {
  RefineThemes,
  ThemedLayoutV2,
  useNotificationProvider,
} from '@refinedev/antd';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import '@refinedev/antd/dist/reset.css';

import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';

import { DashboardPage } from './pages/dashboard';
import { UserList, UserShow, UserEdit } from './pages/users';
import { OtpCodeList } from './pages/otp-codes/list';
import { RefreshTokenList } from './pages/refresh-tokens/list';
import { LoginPage } from './pages/login';
import { ForbiddenPage } from './pages/forbidden';

import {
  DashboardOutlined,
  UserOutlined,
  SafetyOutlined,
  KeyOutlined,
} from '@ant-design/icons';

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <AntdApp>
          <Refine
            authProvider={authProvider}
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: 'dashboard',
                list: '/dashboard',
                meta: { label: 'Dashboard', icon: <DashboardOutlined /> },
              },
              {
                name: 'users',
                list: '/users',
                show: '/users/:id',
                edit: '/users/:id/edit',
                meta: { label: 'Пользователи', icon: <UserOutlined /> },
              },
              {
                // resource name = API path: /api/users/otp-codes
                name: 'users/otp-codes',
                list: '/otp-codes',
                meta: { label: 'OTP Коды', icon: <SafetyOutlined /> },
              },
              {
                // resource name = API path: /api/users/refresh-tokens
                name: 'users/refresh-tokens',
                list: '/refresh-tokens',
                meta: { label: 'Refresh Токены', icon: <KeyOutlined /> },
              },
            ]}
            options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
          >
            <Routes>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route
                element={
                  <Authenticated key="auth" fallback={<Navigate to="/login" />}>
                    <ThemedLayoutV2>
                      <Outlet />
                    </ThemedLayoutV2>
                  </Authenticated>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/users/:id" element={<UserShow />} />
                <Route path="/users/:id/edit" element={<UserEdit />} />
                <Route path="/otp-codes" element={<OtpCodeList />} />
                <Route path="/refresh-tokens" element={<RefreshTokenList />} />
                <Route path="/403" element={<ForbiddenPage />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
