import { Edit, useForm } from '@refinedev/antd';
import { Form, Select } from 'antd';

export const UserEdit = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={{ ...saveButtonProps, children: 'Сохранить' }} title="Редактировать пользователя">
      <Form {...formProps} layout="vertical">
        <Form.Item label="Роль" name="role" rules={[{ required: true, message: 'Выберите роль' }]}>
          <Select
            options={[
              { label: 'Пользователь', value: 'user' },
              { label: 'Администратор', value: 'admin' },
            ]}
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
