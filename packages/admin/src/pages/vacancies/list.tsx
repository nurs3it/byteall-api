import { useTable, CreateButton, EditButton, DeleteButton } from '@refinedev/antd';
import { useCustomMutation, useApiUrl, useInvalidate } from '@refinedev/core';
import { Table, Tag, Select, Space } from 'antd';
import dayjs from 'dayjs';

const statusOptions = [
  { value: 'draft', label: <Tag color="default">Черновик</Tag> },
  { value: 'published', label: <Tag color="green">Опубликована</Tag> },
  { value: 'closed', label: <Tag color="red">Закрыта</Tag> },
];

export const VacancyList = () => {
  const { tableProps } = useTable({ resource: 'vacancies/admin', syncWithLocation: true });
  const { mutate: patchVacancy } = useCustomMutation();
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <CreateButton resource="vacancies/admin" />
      </div>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="title" title="Название" />
        <Table.Column dataIndex="department" title="Отдел" render={(v) => <Tag>{v}</Tag>} />
        <Table.Column dataIndex="location" title="Локация" />
        <Table.Column dataIndex="type" title="Тип" />
        <Table.Column
          dataIndex="isNew"
          title="New"
          render={(v) => v ? <Tag color="blue">New</Tag> : '—'}
        />
        <Table.Column
          dataIndex="_count"
          title="Заявки"
          render={(v) => v?.applications ?? 0}
        />
        <Table.Column
          dataIndex="status"
          title="Статус"
          render={(status, record: any) => (
            <Select
              value={status}
              size="small"
              style={{ width: 140 }}
              onChange={(val) => {
                patchVacancy(
                  { url: `${apiUrl}/vacancies/admin/${record.id}`, method: 'patch', values: { status: val } },
                  { onSuccess: () => invalidate({ resource: 'vacancies/admin', invalidates: ['list'] }) },
                );
              }}
              options={statusOptions}
            />
          )}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Создана"
          render={(v) => dayjs(v).format('DD.MM.YYYY')}
        />
        <Table.Column
          title="Действия"
          render={(_, record: any) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </>
  );
};
