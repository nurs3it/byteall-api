import { useState } from 'react';
import { useTable } from '@refinedev/antd';
import { useCreate, useInvalidate } from '@refinedev/core';
import { Table, Space, Button, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DeleteButton } from '@refinedev/antd';

export const CategoryList = () => {
  const { tableProps } = useTable({ resource: 'categories', syncWithLocation: true });
  const { mutate: createCategory, isLoading } = useCreate();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = (values: { name: string }) => {
    createCategory(
      { resource: 'categories', values },
      {
        onSuccess: () => {
          form.resetFields();
          setOpen(false);
          invalidate({ resource: 'categories', invalidates: ['list'] });
        },
      },
    );
  };

  return (
    <>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Добавить категорию
        </Button>
      </div>
      <Modal
        title="Новая категория" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={isLoading}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input placeholder="Новости" />
          </Form.Item>
        </Form>
      </Modal>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Название" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column
          title="Действия"
          render={(_, record: any) => (
            <Space>
              <DeleteButton hideText size="small" recordItemId={record.id} resource="categories" />
            </Space>
          )}
        />
      </Table>
    </>
  );
};
