import { useTable, CreateButton, EditButton, DeleteButton } from '@refinedev/antd';
import { useCustomMutation, useApiUrl, useInvalidate } from '@refinedev/core';
import { Table, Tag, Select, Space } from 'antd';
import dayjs from 'dayjs';

export const PostList = () => {
  const { tableProps } = useTable({ resource: 'posts/admin', syncWithLocation: true });
  const { mutate: patchStatus } = useCustomMutation();
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <CreateButton resource="posts/admin" />
      </div>
    <Table {...tableProps} rowKey="id">
      <Table.Column dataIndex="title" title="Заголовок" />
      <Table.Column
        dataIndex={['author', 'email']} title="Автор"
        render={(email) => email ?? '—'}
      />
      <Table.Column
        dataIndex={['category', 'name']} title="Категория"
        render={(name) => name ?? '—'}
      />
      <Table.Column
        dataIndex="tags" title="Теги"
        render={(tags: { name: string }[]) =>
          tags?.map((t) => <Tag key={t.name}>{t.name}</Tag>)
        }
      />
      <Table.Column
        dataIndex="status" title="Статус"
        render={(status, record: any) => (
          <Select
            value={status}
            size="small"
            style={{ width: 130 }}
            onChange={(val) => {
              patchStatus(
                { url: `${apiUrl}/posts/${record.id}/status`, method: 'patch', values: { status: val } },
                { onSuccess: () => invalidate({ resource: 'posts/admin', invalidates: ['list'] }) },
              );
            }}
            options={[
              { value: 'draft', label: <Tag color="default">Черновик</Tag> },
              { value: 'published', label: <Tag color="green">Опубликован</Tag> },
            ]}
          />
        )}
      />
      <Table.Column
        dataIndex="publishedAt" title="Дата публикации"
        render={(v) => v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '—'}
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
