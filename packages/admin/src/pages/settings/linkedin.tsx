import { useEffect, useState } from 'react';
import { Card, Button, Typography, Tag, Input, Space, Descriptions, Alert, Popconfirm, message } from 'antd';
import { LinkedinOutlined, CheckCircleOutlined, CloseCircleOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useApiUrl } from '@refinedev/core';
import axios from 'axios';

const { Title, Paragraph } = Typography;

interface LinkedInStatus {
  connected: boolean;
  organizationId: string | null;
  expiresAt: string | null;
  isExpired: boolean;
}

function getToken() {
  return localStorage.getItem('access_token');
}

export function LinkedInSettings() {
  const apiUrl = useApiUrl();
  const [status, setStatus] = useState<LinkedInStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${apiUrl}/linkedin/status`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const s = data?.data ?? data;
      setStatus(s);
      if (s?.organizationId) setOrgId(s.organizationId);
    } catch {
      setStatus({ connected: false, organizationId: null, expiresAt: null, isExpired: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      message.success('LinkedIn успешно подключён!');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      message.error(`Ошибка подключения: ${params.get('error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/linkedin/auth-url`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const url = data?.data?.url ?? data?.url;
      if (url) {
        window.location.href = url;
      } else {
        message.error('Не удалось получить URL авторизации');
      }
    } catch {
      message.error('Ошибка при получении URL авторизации');
    }
  };

  const handleSaveOrg = async () => {
    if (!orgId.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${apiUrl}/linkedin/organization`, { organizationId: orgId.trim() }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      message.success('Organization ID сохранён');
      fetchStatus();
    } catch {
      message.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.delete(`${apiUrl}/linkedin/disconnect`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      message.success('LinkedIn отключён');
      setStatus({ connected: false, organizationId: null, expiresAt: null, isExpired: false });
      setOrgId('');
    } catch {
      message.error('Ошибка при отключении');
    }
  };

  const handleTest = async () => {
    try {
      await axios.post(`${apiUrl}/linkedin/test`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      message.success('Тестовый пост опубликован в LinkedIn!');
    } catch (e: any) {
      message.error(`Ошибка: ${e?.response?.data?.message || e.message}`);
    }
  };

  if (loading) return <Card loading style={{ maxWidth: 700 }} />;

  return (
    <div style={{ maxWidth: 700 }}>
      <Title level={3}>
        <LinkedinOutlined style={{ marginRight: 8 }} />
        LinkedIn интеграция
      </Title>

      <Paragraph type="secondary">
        Подключите LinkedIn чтобы автоматически публиковать статьи на странице компании.
      </Paragraph>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Статус">
            {status?.connected ? (
              status.isExpired ? (
                <Tag icon={<CloseCircleOutlined />} color="warning">Токен истёк</Tag>
              ) : (
                <Tag icon={<CheckCircleOutlined />} color="success">Подключено</Tag>
              )
            ) : (
              <Tag color="default">Не подключено</Tag>
            )}
          </Descriptions.Item>
          {status?.connected && status.expiresAt && (
            <Descriptions.Item label="Токен действителен до">
              {new Date(status.expiresAt).toLocaleString('ru-RU')}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Organization ID">
            {status?.organizationId || '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {!status?.connected ? (
        <Card title="Подключить LinkedIn">
          <Alert
            message="Для подключения необходимо"
            description={
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>Зарегистрировать приложение на developer.linkedin.com</li>
                <li>Добавить LINKEDIN_CLIENT_ID и LINKEDIN_CLIENT_SECRET в .env</li>
                <li>Настроить Redirect URL: {`${apiUrl}/linkedin/callback`}</li>
                <li>Получить доступ к продуктам &quot;Share on LinkedIn&quot; и &quot;Community Management API&quot;</li>
              </ol>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" icon={<LinkedinOutlined />} onClick={handleConnect} size="large">
            Подключить LinkedIn
          </Button>
        </Card>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card title="Organization ID" size="small">
            <Paragraph type="secondary">
              ID страницы компании в LinkedIn. Найдите его в URL страницы:
              linkedin.com/company/[name]/ → Admin → Settings.
            </Paragraph>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="Например: 12345678"
              />
              <Button type="primary" onClick={handleSaveOrg} loading={saving}>
                Сохранить
              </Button>
            </Space.Compact>
          </Card>

          <Card title="Действия" size="small">
            <Space>
              <Button onClick={handleTest} disabled={!status.organizationId}>
                Тестовый пост
              </Button>
              {status.isExpired && (
                <Button type="primary" icon={<LinkedinOutlined />} onClick={handleConnect}>
                  Обновить токен
                </Button>
              )}
              <Popconfirm title="Отключить LinkedIn?" onConfirm={handleDisconnect}>
                <Button danger icon={<DisconnectOutlined />}>
                  Отключить
                </Button>
              </Popconfirm>
            </Space>
          </Card>
        </Space>
      )}
    </div>
  );
}
