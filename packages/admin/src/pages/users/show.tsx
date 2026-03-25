import { Show, TextField, DateField } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Typography, Tag } from 'antd';

const { Title } = Typography;

export const UserShow = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;
  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>ID</Title>
      <TextField value={record?.id} />

      <Title level={5}>Email</Title>
      <TextField value={record?.email ?? '—'} />

      <Title level={5}>Телефон</Title>
      <TextField value={record?.phone ?? '—'} />

      <Title level={5}>Роль</Title>
      <Tag color={record?.role === 'admin' ? 'red' : 'blue'}>{record?.role}</Tag>

      <Title level={5}>Подтверждён</Title>
      <Tag color={record?.isVerified ? 'green' : 'orange'}>
        {record?.isVerified ? 'Да' : 'Нет'}
      </Tag>

      <Title level={5}>Дата регистрации</Title>
      <DateField value={record?.createdAt} format="DD.MM.YYYY HH:mm" />
    </Show>
  );
};
