import { useCustom, useApiUrl } from '@refinedev/core';
import {
  Card,
  Col,
  Row,
  Statistic,
  Spin,
  Typography,
  Progress,
  List,
  Avatar,
  Tag,
  Divider,
} from 'antd';
import {
  UserOutlined,
  SafetyOutlined,
  KeyOutlined,
  MailOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  TagsOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  activeTokens: number;
  otpToday: number;
}

interface PostStats {
  total: number;
  published: number;
  draft: number;
  categories: number;
  tags: number;
}

const cardStyle = {
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

export const DashboardPage = () => {
  const apiUrl = useApiUrl();

  const { data: usersData, isLoading: usersLoading } = useCustom<Stats>({
    url: `${apiUrl}/users/stats`,
    method: 'get',
  });

  const { data: postsData, isLoading: postsLoading } = useCustom<PostStats>({
    url: `${apiUrl}/posts/admin/stats`,
    method: 'get',
    errorNotification: false,
  });

  const stats = usersData?.data;
  const postStats = postsData?.data;

  const isLoading = usersLoading;

  if (isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const verifiedPercent =
    stats?.totalUsers && stats.totalUsers > 0
      ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100)
      : 0;

  const publishedPercent =
    postStats?.total && postStats.total > 0
      ? Math.round((postStats.published / postStats.total) * 100)
      : 0;

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        Обзор системы
      </Title>

      {/* === Пользователи === */}
      <Text strong type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        Пользователи
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8, marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Всего пользователей"
              value={stats?.totalUsers ?? 0}
              prefix={<UserOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Подтверждённые"
              value={stats?.verifiedUsers ?? 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={verifiedPercent}
              size="small"
              strokeColor="#52c41a"
              style={{ marginTop: 8 }}
              showInfo={false}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {verifiedPercent}% верифицировано
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Активных сессий"
              value={stats?.activeTokens ?? 0}
              prefix={<KeyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="OTP сегодня"
              value={stats?.otpToday ?? 0}
              prefix={<MailOutlined style={{ color: '#eb2f96' }} />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* === Контент === */}
      <Text strong type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        Контент
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8, marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Всего статей"
              value={postsLoading ? '—' : (postStats?.total ?? 0)}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Опубликовано"
              value={postsLoading ? '—' : (postStats?.published ?? 0)}
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            {!postsLoading && postStats && (
              <>
                <Progress
                  percent={publishedPercent}
                  size="small"
                  strokeColor="#52c41a"
                  style={{ marginTop: 8 }}
                  showInfo={false}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {publishedPercent}% опубликовано
                </Text>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Черновики"
              value={postsLoading ? '—' : (postStats?.draft ?? 0)}
              prefix={<ClockCircleOutlined style={{ color: '#8c8c8c' }} />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="Категории"
                  value={postsLoading ? '—' : (postStats?.categories ?? 0)}
                  prefix={<AppstoreOutlined style={{ color: '#13c2c2' }} />}
                  valueStyle={{ fontSize: 20 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Теги"
                  value={postsLoading ? '—' : (postStats?.tags ?? 0)}
                  prefix={<TagsOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ fontSize: 20 }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* === Быстрые ссылки === */}
      <Text strong type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        Быстрые ссылки
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        {[
          { icon: <UserOutlined />, label: 'Пользователи', href: '/users', color: '#1677ff', desc: 'Управление аккаунтами' },
          { icon: <FileTextOutlined />, label: 'Статьи', href: '/posts', color: '#722ed1', desc: 'Создание и редактирование' },
          { icon: <AppstoreOutlined />, label: 'Категории', href: '/categories', color: '#13c2c2', desc: 'Разделы контента' },
          { icon: <TagsOutlined />, label: 'Теги', href: '/tags', color: '#fa8c16', desc: 'Метки для фильтрации' },
          { icon: <SafetyOutlined />, label: 'OTP Коды', href: '/otp-codes', color: '#eb2f96', desc: 'Коды подтверждения' },
          { icon: <KeyOutlined />, label: 'Токены', href: '/refresh-tokens', color: '#faad14', desc: 'Активные сессии' },
        ].map(({ icon, label, href, color, desc }) => (
          <Col xs={12} sm={8} lg={4} key={href}>
            <a href={href} style={{ textDecoration: 'none' }}>
              <Card
                hoverable
                style={{ ...cardStyle, textAlign: 'center' }}
                bodyStyle={{ padding: '20px 12px' }}
              >
                <Avatar
                  size={48}
                  style={{ background: color + '18', color, marginBottom: 8, fontSize: 22 }}
                  icon={icon}
                />
                <div style={{ fontWeight: 600, color: '#000' }}>{label}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>{desc}</Text>
              </Card>
            </a>
          </Col>
        ))}
      </Row>
    </div>
  );
};
