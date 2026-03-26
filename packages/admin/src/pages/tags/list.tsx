import { useState } from 'react';
import { useTable } from '@refinedev/antd';
import { useCreate, useInvalidate } from '@refinedev/core';
import { Table, Space, Button, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DeleteButton } from '@refinedev/antd';

export const TagList = () => {
  const { tableProps } = useTable({ resource: 'tags', syncWithLocation: true });
  const { mutate: createTag, isLoading } = useCreate();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = (values: { name: string }) => {
    createTag(
      { resource: 'tags', values },
      {
        onSuccess: () => {
          form.resetFields();
          setOpen(false);
          invalidate({ resource: 'tags', invalidates: ['list'] });
        },
      },
    );
  };

  return (
    <>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Добавить тег
        </Button>
      </div>
      <Modal
        title="Новый тег" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={isLoading}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input placeholder="обновление" />
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
              <DeleteButton hideText size="small" recordItemId={record.id} resource="tags" />
            </Space>
          )}
        />
      </Table>
    </>
  );
};
