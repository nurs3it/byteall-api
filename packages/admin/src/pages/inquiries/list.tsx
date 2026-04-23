import { List, useTable, DateField } from '@refinedev/antd';
import { Table, Tag, Select, Space, Button, Popconfirm } from 'antd';
import { useUpdate, useDelete } from '@refinedev/core';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  new: { color: 'blue', label: 'Новое' },
  read: { color: 'orange', label: 'Прочитано' },
  replied: { color: 'green', label: 'Отвечено' },
  closed: { color: 'default', label: 'Закрыто' },
};

export function InquiryList() {
  const { tableProps } = useTable({
    resource: 'inquiries/admin',
    syncWithLocation: true,
  });
  const { mutate: update } = useUpdate();
  const { mutate: remove } = useDelete();
  const navigate = useNavigate();

  const handleStatusChange = (id: string, status: string) => {
    update({
      resource: 'inquiries/admin',
      id: `${id}/status`,
      values: { status },
      mutationMode: 'optimistic',
    });
  };

  return (
    <List title="Обращения">
      <Table {...tableProps} rowKey="id" size="middle">
        <Table.Column
          title="Дата"
          dataIndex="createdAt"
          width={140}
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
        <Table.Column title="Имя" dataIndex="name" width={160} />
        <Table.Column title="Email" dataIndex="email" width={200} />
        <Table.Column title="Тема" dataIndex="subject" ellipsis />
        <Table.Column
          title="Статус"
          dataIndex="status"
          width={150}
          render={(status, record: any) => (
            <Select
              value={status}
              onChange={(v) => handleStatusChange(record.id, v)}
              size="small"
              style={{ width: 130 }}
              options={Object.entries(STATUS_MAP).map(([value, { label }]) => ({
                value,
                label,
              }))}
            />
          )}
        />
        <Table.Column
          title=""
          width={90}
          render={(_, record: any) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/inquiries/${record.id}`)}
              />
              <Popconfirm
                title="Удалить обращение?"
                onConfirm={() =>
                  remove({
                    resource: 'inquiries/admin',
                    id: record.id,
                    mutationMode: 'optimistic',
                  })
                }
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
