import { List, useTable, DateField } from '@refinedev/antd';
import { Table, Tag } from 'antd';

export const OtpCodeList = () => {
  const { tableProps } = useTable({ syncWithLocation: true });

  return (
    <List canCreate={false}>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Пользователь"
          render={(_, record: any) => record?.user?.email ?? record?.user?.phone ?? '—'}
        />
        <Table.Column dataIndex="type" title="Тип" render={(v) => <Tag>{v}</Tag>} />
        <Table.Column
          dataIndex="used"
          title="Использован"
          render={(v) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Да' : 'Нет'}</Tag>}
        />
        <Table.Column dataIndex="attempts" title="Попыток" />
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
