import { useTable, ShowButton, DeleteButton } from '@refinedev/antd';
import { useCustomMutation, useApiUrl, useInvalidate } from '@refinedev/core';
import { Table, Tag, Select, Space } from 'antd';
import dayjs from 'dayjs';

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

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value,
  label: <Tag color={statusColors[value]}>{label}</Tag>,
}));

export const ApplicationList = () => {
  const { tableProps } = useTable({ resource: 'applications/admin', syncWithLocation: true });
  const { mutate: patchStatus } = useCustomMutation();
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();

  return (
    <Table {...tableProps} rowKey="id">
      <Table.Column
        title="Кандидат"
        render={(_, record: any) => `${record.firstName} ${record.lastName}`}
      />
      <Table.Column dataIndex="email" title="Email" />
      <Table.Column dataIndex="phone" title="Телефон" render={(v) => v ?? '—'} />
      <Table.Column
        dataIndex={['vacancy', 'title']}
        title="Вакансия"
        render={(title) => title ?? <Tag>Общая заявка</Tag>}
      />
      <Table.Column
        dataIndex="resumeUrl"
        title="Резюме"
        render={(url) =>
          url ? (
            <a href={url} target="_blank" rel="noopener noreferrer">Скачать</a>
          ) : '—'
        }
      />
      <Table.Column
        dataIndex="status"
        title="Статус"
        render={(status, record: any) => (
          <Select
            value={status}
            size="small"
            style={{ width: 150 }}
            onChange={(val) => {
              patchStatus(
                {
                  url: `${apiUrl}/applications/admin/${record.id}/status`,
                  method: 'patch',
                  values: { status: val },
                },
                { onSuccess: () => invalidate({ resource: 'applications/admin', invalidates: ['list'] }) },
              );
            }}
            options={statusOptions}
          />
        )}
      />
      <Table.Column
        dataIndex="createdAt"
        title="Дата"
        render={(v) => dayjs(v).format('DD.MM.YYYY HH:mm')}
      />
      <Table.Column
        title="Действия"
        render={(_, record: any) => (
          <Space>
            <ShowButton hideText size="small" recordItemId={record.id} />
            <DeleteButton hideText size="small" recordItemId={record.id} />
          </Space>
        )}
      />
    </Table>
  );
};
