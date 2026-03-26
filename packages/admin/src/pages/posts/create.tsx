import { Create, useForm, useSelect } from '@refinedev/antd';
import { Form, Input, Select, Upload, Button, Row, Col } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useApiUrl } from '@refinedev/core';
import { RichTextEditor } from '../../components/RichTextEditor';
import axios from 'axios';

export const PostCreate = () => {
  const { formProps, saveButtonProps, form } = useForm({ resource: 'posts' });
  const apiUrl = useApiUrl();

  const { selectProps: categoryProps } = useSelect({
    resource: 'categories', optionLabel: 'name', optionValue: 'id',
  });
  const { selectProps: tagProps } = useSelect({
    resource: 'tags', optionLabel: 'name', optionValue: 'id',
  });

  const uploadCover = async (file: File) => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axios.post(`${apiUrl}/uploads/image?folder=covers`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    const url = data?.data?.url ?? data?.url;
    form.setFieldValue('coverUrl', url);
    return false;
  };

  return (
    <Create
      footerButtons={
        <Row gutter={8}>
          <Col>
            <Button onClick={() => { form.setFieldValue('status', 'draft'); form.submit(); }}>
              Черновик
            </Button>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { form.setFieldValue('status', 'published'); form.submit(); }}>
              Опубликовать
            </Button>
          </Col>
        </Row>
      }
    >
      <Form {...formProps} layout="vertical" initialValues={{ status: 'draft' }}>
        <Form.Item name="status" hidden><Input /></Form.Item>
        <Form.Item name="title" label="Заголовок" rules={[{ required: true }]}>
          <Input placeholder="Заголовок статьи" />
        </Form.Item>
        <Form.Item label="Обложка" name="coverUrl">
          <Upload showUploadList={false} beforeUpload={uploadCover} accept="image/*">
            <Button icon={<UploadOutlined />}>Загрузить обложку</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="categoryId" label="Категория">
          <Select {...categoryProps} allowClear placeholder="Выберите категорию" />
        </Form.Item>
        <Form.Item name="tagIds" label="Теги">
          <Select {...tagProps} mode="multiple" allowClear placeholder="Выберите теги" />
        </Form.Item>
        <Form.Item name="content" label="Содержание" rules={[{ required: true }]}>
          <RichTextEditor />
        </Form.Item>
      </Form>
    </Create>
  );
};
