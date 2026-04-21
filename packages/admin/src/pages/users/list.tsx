import { List, useTable, DateField, EditButton, ShowButton } from '@refinedev/antd';
import { Table, Space, Tag } from 'antd';

export const UserList = () => {
  const { tableProps } = useTable({ syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column
          dataIndex="role"
          title="Роль"
          render={(role) => (
            <Tag color={role === 'admin' ? 'red' : 'blue'}>{role}</Tag>
          )}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Дата регистрации"
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
        <Table.Column
          title="Действия"
          render={(_, record: any) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
              <EditButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
