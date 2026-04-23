import { Refine, Authenticated, I18nProvider } from '@refinedev/core';
import {
  RefineThemes,
  ThemedLayoutV2,
  ThemedTitleV2,
  useNotificationProvider,
} from '@refinedev/antd';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import routerProvider from '@refinedev/react-router-v6';
import { ConfigProvider, App as AntdApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import '@refinedev/antd/dist/reset.css';

import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';

import { DashboardPage } from './pages/dashboard';
import { UserList, UserShow, UserEdit } from './pages/users';
import { RefreshTokenList } from './pages/refresh-tokens/list';
import { LoginPage } from './pages/login';
import { ForbiddenPage } from './pages/forbidden';
import { PostList, PostCreate, PostEdit } from './pages/posts';
import { CategoryList } from './pages/categories';
import { TagList } from './pages/tags';
import { VacancyList, VacancyCreate, VacancyEdit } from './pages/vacancies';
import { ApplicationList, ApplicationShow } from './pages/applications';
import { InquiryList, InquiryShow } from './pages/inquiries';
import { LinkedInSettings } from './pages/settings/linkedin';

import {
  DashboardOutlined,
  UserOutlined,
  KeyOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  TagsOutlined,
  SolutionOutlined,
  TeamOutlined,
  MessageOutlined,
  SettingOutlined,
  LinkedinOutlined,
} from '@ant-design/icons';

const i18nProvider: I18nProvider = {
  translate: (key: string, options?: any) => {
    const map: Record<string, string> = {
      'buttons.save': 'Сохранить',
      'buttons.create': 'Создать',
      'buttons.edit': 'Редактировать',
      'buttons.delete': 'Удалить',
      'buttons.show': 'Просмотр',
      'buttons.list': 'Список',
      'buttons.refresh': 'Обновить',
      'buttons.back': 'Назад',
      'buttons.cancel': 'Отмена',
      'buttons.clone': 'Клонировать',
      'buttons.confirm': 'Подтвердить',
      'buttons.accept': 'Принять',
      'buttons.reject': 'Отклонить',
      'notifications.success': 'Успешно',
      'notifications.error': 'Ошибка',
      'notifications.createSuccess': '{{resource}} успешно создан',
      'notifications.createError': 'Ошибка при создании {{resource}}',
      'notifications.editSuccess': '{{resource}} успешно обновлён',
      'notifications.editError': 'Ошибка при обновлении {{resource}}',
      'notifications.deleteSuccess': '{{resource}} успешно удалён',
      'notifications.deleteError': 'Ошибка при удалении {{resource}}',
      'pages.login.title': 'Войти в аккаунт',
      'pages.login.signin': 'Войти',
      'pages.login.fields.email': 'Email',
      'pages.login.fields.password': 'Пароль',
      'pages.login.errors.requiredEmail': 'Введите email',
      'pages.login.errors.requiredPassword': 'Введите пароль',
      'pages.error.info': 'Вы забыли добавить',
      'pages.error.404': 'Страница не найдена',
      'pages.error.resource404': 'Ресурс не найден',
      'pages.error.backHome': 'На главную',
      'table.actions': 'Действия',
      'confirmDeleteTitle': 'Вы уверены?',
      'warnWhenUnsavedChanges': 'Несохранённые изменения будут потеряны. Вы уверены?',
    };
    const translated = map[key];
    if (translated) {
      if (options && typeof options === 'object') {
        return translated.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => options[k] ?? k);
      }
      return translated;
    }
    return options?.defaultValue ?? key;
  },
  changeLocale: async () => {},
  getLocale: () => 'ru',
};

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue} locale={ruRU}>
        <AntdApp>
          <Refine
            authProvider={authProvider}
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider}
            routerProvider={routerProvider}
            i18nProvider={i18nProvider}
            resources={[
              {
                name: 'dashboard',
                list: '/dashboard',
                meta: { label: 'Dashboard', icon: <DashboardOutlined /> },
              },
              {
                name: 'users-group',
                meta: { label: 'Пользователи', icon: <UserOutlined /> },
              },
              {
                name: 'users',
                list: '/users',
                show: '/users/:id',
                edit: '/users/:id/edit',
                meta: { label: 'Пользователи', icon: <UserOutlined />, parent: 'users-group' },
              },
              {
                name: 'users/refresh-tokens',
                list: '/refresh-tokens',
                meta: { label: 'Refresh Токены', icon: <KeyOutlined />, parent: 'users-group' },
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
              {
                name: 'careers',
                meta: { label: 'Карьера', icon: <TeamOutlined /> },
              },
              {
                name: 'vacancies/admin',
                list: '/vacancies',
                create: '/vacancies/create',
                edit: '/vacancies/:id/edit',
                meta: { label: 'Вакансии', icon: <SolutionOutlined />, parent: 'careers' },
              },
              {
                name: 'applications/admin',
                list: '/applications',
                show: '/applications/:id',
                meta: { label: 'Заявки', icon: <TeamOutlined />, parent: 'careers' },
              },
              {
                name: 'inquiries/admin',
                list: '/inquiries',
                show: '/inquiries/:id',
                meta: { label: 'Обращения', icon: <MessageOutlined /> },
              },
              {
                name: 'settings',
                meta: { label: 'Настройки', icon: <SettingOutlined /> },
              },
              {
                name: 'settings/linkedin',
                list: '/settings/linkedin',
                meta: { label: 'LinkedIn', icon: <LinkedinOutlined />, parent: 'settings' },
              },
            ]}
            options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
          >
            <Routes>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route
                element={
                  <Authenticated key="auth" fallback={<Navigate to="/login" />}>
                    <ThemedLayoutV2
                      Title={({ collapsed }) => (
                        <ThemedTitleV2
                          collapsed={collapsed}
                          text="Byteall Admin"
                        />
                      )}
                    >
                      <Outlet />
                    </ThemedLayoutV2>
                  </Authenticated>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/users/:id" element={<UserShow />} />
                <Route path="/users/:id/edit" element={<UserEdit />} />
                <Route path="/refresh-tokens" element={<RefreshTokenList />} />
                <Route path="/posts" element={<PostList />} />
                <Route path="/posts/create" element={<PostCreate />} />
                <Route path="/posts/:id/edit" element={<PostEdit />} />
                <Route path="/categories" element={<CategoryList />} />
                <Route path="/tags" element={<TagList />} />
                <Route path="/vacancies" element={<VacancyList />} />
                <Route path="/vacancies/create" element={<VacancyCreate />} />
                <Route path="/vacancies/:id/edit" element={<VacancyEdit />} />
                <Route path="/applications" element={<ApplicationList />} />
                <Route path="/applications/:id" element={<ApplicationShow />} />
                <Route path="/inquiries" element={<InquiryList />} />
                <Route path="/inquiries/:id" element={<InquiryShow />} />
                <Route path="/settings/linkedin" element={<LinkedInSettings />} />
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
