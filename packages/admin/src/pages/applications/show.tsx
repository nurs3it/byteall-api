import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Tag, Typography, Divider } from 'antd';
import dayjs from 'dayjs';

const { Paragraph, Link } = Typography;

const statusColors: Record<string, string> = {
  new: 'blue',
  reviewing: 'orange',
  interview: 'purple',
  offered: 'cyan',
  rejected: 'red',
  hired: 'green',
};

const statusLabels: Record<string, string> = {
  new: 'Новая',
  reviewing: 'Рассмотрение',
  interview: 'Интервью',
  offered: 'Оффер',
  rejected: 'Отклонена',
  hired: 'Принят',
};

export const ApplicationShow = () => {
  const { queryResult } = useShow({ resource: 'applications/admin' });
  const record = queryResult?.data?.data as any;

  if (!record) return null;

  return (
    <Show title={`Заявка: ${record.firstName} ${record.lastName}`}>
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Имя">{record.firstName}</Descriptions.Item>
        <Descriptions.Item label="Фамилия">{record.lastName}</Descriptions.Item>
        <Descriptions.Item label="Email">{record.email}</Descriptions.Item>
        <Descriptions.Item label="Телефон">{record.phone ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Вакансия">
          {record.vacancy?.title ?? <Tag>Общая заявка</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="Статус">
          <Tag color={statusColors[record.status]}>{statusLabels[record.status] ?? record.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Дата подачи">
          {dayjs(record.createdAt).format('DD.MM.YYYY HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="Резюме">
          {record.resumeUrl ? (
            <Link href={record.resumeUrl} target="_blank">Скачать резюме</Link>
          ) : '—'}
        </Descriptions.Item>
      </Descriptions>

      {record.coverLetter && (
        <>
          <Divider />
          <Typography.Title level={5}>Сопроводительное письмо</Typography.Title>
          <Paragraph>{record.coverLetter}</Paragraph>
        </>
      )}

      {record.notes && (
        <>
          <Divider />
          <Typography.Title level={5}>Заметки</Typography.Title>
          <Paragraph>{record.notes}</Paragraph>
        </>
      )}
    </Show>
  );
};
