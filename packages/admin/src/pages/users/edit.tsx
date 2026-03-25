import { Edit, useForm } from '@refinedev/antd';
import { Form, Select } from 'antd';

export const UserEdit = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Роль" name="role" rules={[{ required: true }]}>
          <Select
            options={[
              { label: 'user', value: 'user' },
              { label: 'admin', value: 'admin' },
            ]}
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
