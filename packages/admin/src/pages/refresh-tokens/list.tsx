import { List, useTable, DateField } from '@refinedev/antd';
import { Table, Tag } from 'antd';

export const RefreshTokenList = () => {
  const { tableProps } = useTable({ syncWithLocation: true });

  return (
    <List canCreate={false}>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Пользователь"
          render={(_, record: any) => record?.user?.email ?? '—'}
        />
        <Table.Column
          dataIndex="revoked"
          title="Отозван"
          render={(v) => <Tag color={v ? 'red' : 'green'}>{v ? 'Да' : 'Нет'}</Tag>}
        />
        <Table.Column
          dataIndex="expiresAt"
          title="Истекает"
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Создан"
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
      </Table>
    </List>
  );
};
