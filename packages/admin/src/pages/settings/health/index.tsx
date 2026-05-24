import { useCustom, useApiUrl } from '@refinedev/core';
import {
  Card,
  Typography,
  Spin,
  Tag,
  Descriptions,
  Button,
  Space,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

type ServiceStatus = {
  status: 'up' | 'down';
  latencyMs?: number;
  message?: string;
};

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  services: Record<string, ServiceStatus>;
}

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}д`);
  if (h) parts.push(`${h}ч`);
  if (m) parts.push(`${m}м`);
  parts.push(`${s}с`);
  return parts.join(' ');
};

const StatusTag = ({ status }: { status: 'up' | 'down' | 'ok' | 'degraded' }) => {
  const isHealthy = status === 'up' || status === 'ok';
  return (
    <Tag
      color={isHealthy ? 'success' : 'error'}
      icon={isHealthy ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
    >
      {isHealthy ? 'Работает' : 'Не работает'}
    </Tag>
  );
};

export const HealthPage = () => {
  const apiUrl = useApiUrl();

  const { data, isLoading, isFetching, refetch, isError } =
    useCustom<HealthResponse>({
      url: `${apiUrl}/health`,
      method: 'get',
      queryOptions: { refetchInterval: 30_000 },
      errorNotification: false,
    });

  const health = data?.data;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>
          Состояние сервисов
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isFetching}
        >
          Обновить
        </Button>
      </Space>

      {isLoading ? (
        <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
      ) : isError || !health ? (
        <Alert
          type="error"
          showIcon
          message="Не удалось получить состояние"
          description="API недоступен либо вернул ошибку. Проверьте, что бэкенд запущен."
        />
      ) : (
        <>
          <Card>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Общий статус">
                <StatusTag status={health.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Версия">
                <Text code>{health.version}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Аптайм">
                {formatUptime(health.uptimeSeconds)}
              </Descriptions.Item>
              <Descriptions.Item label="Проверено">
                {new Date(health.timestamp).toLocaleString('ru-RU')}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Сервисы">
            <Descriptions column={1} bordered size="small">
              {Object.entries(health.services).map(([name, svc]) => (
                <Descriptions.Item
                  key={name}
                  label={<Text strong style={{ textTransform: 'capitalize' }}>{name}</Text>}
                >
                  <Space size="middle">
                    <StatusTag status={svc.status} />
                    {svc.latencyMs !== undefined && (
                      <Text type="secondary">{svc.latencyMs} мс</Text>
                    )}
                    {svc.message && (
                      <Text type="danger">{svc.message}</Text>
                    )}
                  </Space>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </>
      )}
    </Space>
  );
};
