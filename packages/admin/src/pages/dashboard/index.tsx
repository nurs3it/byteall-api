import { useCustom, useApiUrl } from '@refinedev/core';
import { Card, Col, Row, Statistic, Spin } from 'antd';
import { UserOutlined, SafetyOutlined, KeyOutlined, MailOutlined } from '@ant-design/icons';

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  activeTokens: number;
  otpToday: number;
}

export const DashboardPage = () => {
  const apiUrl = useApiUrl();
  const { data, isLoading } = useCustom<Stats>({
    url: `${apiUrl}/users/stats`,
    method: 'get',
  });

  const stats = data?.data;

  if (isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <Row gutter={[16, 16]} style={{ padding: 24 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Всего пользователей"
            value={stats?.totalUsers ?? 0}
            prefix={<UserOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Подтверждённые"
            value={stats?.verifiedUsers ?? 0}
            prefix={<SafetyOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Активных сессий"
            value={stats?.activeTokens ?? 0}
            prefix={<KeyOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="OTP сегодня"
            value={stats?.otpToday ?? 0}
            prefix={<MailOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};
