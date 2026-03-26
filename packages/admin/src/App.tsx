import { Refine, Authenticated } from '@refinedev/core';
import {
  RefineThemes,
  ThemedLayoutV2,
  useNotificationProvider,
} from '@refinedev/antd';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import routerProvider from '@refinedev/react-router-v6';
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
import { PostList, PostCreate, PostEdit } from './pages/posts';
import { CategoryList } from './pages/categories';
import { TagList } from './pages/tags';

import {
  DashboardOutlined,
  UserOutlined,
  SafetyOutlined,
  KeyOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  TagsOutlined,
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
            routerProvider={routerProvider}
            resources={[
              {
                name: 'main',
                meta: { label: 'Главная', icon: <DashboardOutlined /> },
              },
              {
                name: 'dashboard',
                list: '/dashboard',
                meta: { label: 'Dashboard', icon: <DashboardOutlined />, parent: 'main' },
              },
              {
                name: 'users',
                list: '/users',
                show: '/users/:id',
                edit: '/users/:id/edit',
                meta: { label: 'Пользователи', icon: <UserOutlined />, parent: 'main' },
              },
              {
                name: 'users/otp-codes',
                list: '/otp-codes',
                meta: { label: 'OTP Коды', icon: <SafetyOutlined />, parent: 'main' },
              },
              {
                name: 'users/refresh-tokens',
                list: '/refresh-tokens',
                meta: { label: 'Refresh Токены', icon: <KeyOutlined />, parent: 'main' },
              },
              {
                name: 'news',
                meta: { label: 'Новости', icon: <FileTextOutlined /> },
              },
              {
                name: 'posts/admin',
                list: '/posts',
                create: '/posts/create',
                edit: '/posts/:id/edit',
                meta: { label: 'Все статьи', icon: <FileTextOutlined />, parent: 'news' },
              },
              {
                name: 'categories',
                list: '/categories',
                meta: { label: 'Категории', icon: <AppstoreOutlined />, parent: 'news' },
              },
              {
                name: 'tags',
                list: '/tags',
                meta: { label: 'Теги', icon: <TagsOutlined />, parent: 'news' },
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
                <Route path="/posts" element={<PostList />} />
                <Route path="/posts/create" element={<PostCreate />} />
                <Route path="/posts/:id/edit" element={<PostEdit />} />
                <Route path="/categories" element={<CategoryList />} />
                <Route path="/tags" element={<TagList />} />
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
