import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Tag, Typography } from 'antd';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  new: { color: 'blue', label: 'Новое' },
  read: { color: 'orange', label: 'Прочитано' },
  replied: { color: 'green', label: 'Отвечено' },
  closed: { color: 'default', label: 'Закрыто' },
};

export function InquiryShow() {
  const { queryResult } = useShow({ resource: 'inquiries/admin' });
  const record = queryResult?.data?.data as any;

  if (!record) return null;

  const statusInfo = STATUS_MAP[record.status] ?? { color: 'default', label: record.status };

  return (
    <Show title="Обращение">
      <Descriptions column={1} bordered size="middle">
        <Descriptions.Item label="Имя">{record.name}</Descriptions.Item>
        <Descriptions.Item label="Email">
          <a href={`mailto:${record.email}`}>{record.email}</a>
        </Descriptions.Item>
        {record.phone && (
          <Descriptions.Item label="Телефон">{record.phone}</Descriptions.Item>
        )}
        <Descriptions.Item label="Тема">{record.subject}</Descriptions.Item>
        <Descriptions.Item label="Сообщение">
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {record.message}
          </Typography.Paragraph>
        </Descriptions.Item>
        <Descriptions.Item label="Статус">
          <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
        </Descriptions.Item>
        {record.notes && (
          <Descriptions.Item label="Заметки">
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {record.notes}
            </Typography.Paragraph>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Дата создания">
          {new Date(record.createdAt).toLocaleString('ru-RU')}
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
}
