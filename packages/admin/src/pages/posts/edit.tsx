import { Edit, useForm, useSelect } from '@refinedev/antd';
import { Form, Input, Select, Upload, Button, Row, Col, Image, message, Checkbox, Divider, Alert } from 'antd';
import { UploadOutlined, PlusOutlined, LinkedinOutlined } from '@ant-design/icons';
import { useApiUrl, useCreate, useInvalidate } from '@refinedev/core';
import { RichTextEditor } from '../../components/RichTextEditor';
import axios from 'axios';
import { useState } from 'react';

export const PostEdit = () => {
  const { formProps, saveButtonProps, form } = useForm({ resource: 'posts' });
  const apiUrl = useApiUrl();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const invalidate = useInvalidate();
  const { mutate: createCategory, isLoading: creatingCategory } = useCreate();
  const { mutate: createTag, isLoading: creatingTag } = useCreate();

  const { selectProps: categoryProps, queryResult: categoryQuery } = useSelect({
    resource: 'categories', optionLabel: 'name', optionValue: 'id',
  });
  const { selectProps: tagProps, queryResult: tagQuery } = useSelect({
    resource: 'tags', optionLabel: 'name', optionValue: 'id',
  });

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axios.post(`${apiUrl}/uploads/image?folder=covers`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = data?.data?.url ?? data?.url;
      form.setFieldValue('coverUrl', url);
      setCoverPreview(url);
    } catch {
      message.error('Не удалось загрузить обложку');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleAddCategory = (name: string) => {
    if (!name.trim()) return;
    createCategory(
      { resource: 'categories', values: { name: name.trim() } },
      {
        onSuccess: (data: any) => {
          const newId = data?.data?.id;
          if (newId) {
            const current = form.getFieldValue('categoryId');
            if (!current) form.setFieldValue('categoryId', newId);
          }
          invalidate({ resource: 'categories', invalidates: ['list'] });
          categoryQuery.refetch();
        },
      },
    );
  };

  const handleAddTag = (name: string) => {
    if (!name.trim()) return;
    createTag(
      { resource: 'tags', values: { name: name.trim() } },
      {
        onSuccess: (data: any) => {
          const newId = data?.data?.id;
          if (newId) {
            const current: string[] = form.getFieldValue('tagIds') ?? [];
            form.setFieldValue('tagIds', [...current, newId]);
          }
          invalidate({ resource: 'tags', invalidates: ['list'] });
          tagQuery.refetch();
        },
      },
    );
  };

  const existingCover = form.getFieldValue('coverUrl');

  return (
    <Edit
      title="Редактировать статью"
      footerButtons={
        <Row gutter={8}>
          <Col>
            <Button onClick={() => { form.setFieldValue('status', 'draft'); form.submit(); }}>
              Сохранить черновик
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
      <Form {...formProps} layout="vertical">
        <Form.Item name="status" hidden><Input /></Form.Item>
        <Form.Item name="coverUrl" hidden><Input /></Form.Item>

        <Form.Item name="title" label="Заголовок" rules={[{ required: true, message: 'Введите заголовок' }]}>
          <Input />
        </Form.Item>

        <Form.Item name="authorName" label="Имя автора">
          <Input placeholder="Например: Алибек Сейткали" />
        </Form.Item>

        <Form.Item label="Обложка">
          {(coverPreview || existingCover) && (
            <Image
              src={coverPreview ?? existingCover}
              width={200}
              style={{ marginBottom: 8, borderRadius: 4, display: 'block' }}
            />
          )}
          <Upload showUploadList={false} beforeUpload={uploadCover} accept="image/*">
            <Button icon={<UploadOutlined />} loading={uploading}>
              {uploading ? 'Загрузка...' : 'Заменить обложку'}
            </Button>
          </Upload>
        </Form.Item>

        <Form.Item name="categoryId" label="Категория">
          <Select
            {...categoryProps}
            allowClear
            placeholder="Выберите или создайте категорию"
            loading={creatingCategory}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                  <Input.Search
                    placeholder="Новая категория..."
                    enterButton={<><PlusOutlined /> Создать</>}
                    onSearch={handleAddCategory}
                    size="small"
                  />
                </div>
              </>
            )}
          />
        </Form.Item>

        <Form.Item name="tagIds" label="Теги">
          <Select
            {...tagProps}
            mode="multiple"
            allowClear
            placeholder="Выберите или создайте теги"
            loading={creatingTag}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                  <Input.Search
                    placeholder="Новый тег..."
                    enterButton={<><PlusOutlined /> Создать</>}
                    onSearch={handleAddTag}
                    size="small"
                  />
                </div>
              </>
            )}
          />
        </Form.Item>

        <Form.Item
          name="excerpt"
          label="Краткое описание (для LinkedIn и SEO)"
          extra="До 300 символов. Используется при шаринге в LinkedIn и как meta description."
        >
          <Input.TextArea
            rows={3}
            maxLength={300}
            showCount
            placeholder="Краткое описание статьи для социальных сетей..."
          />
        </Form.Item>

        <Form.Item name="content" label="Содержание" rules={[{ required: true, message: 'Введите содержание' }]}>
          <RichTextEditor />
        </Form.Item>

        <Divider />

        <Alert
          message="LinkedIn интеграция"
          description="При публикации статья будет автоматически расшарена на странице компании в LinkedIn (если чекбокс включён и LinkedIn подключён)."
          type="info"
          showIcon
          icon={<LinkedinOutlined />}
          style={{ marginBottom: 16 }}
        />
        <Form.Item name="shareToLinkedIn" valuePropName="checked">
          <Checkbox>
            <LinkedinOutlined style={{ marginRight: 6 }} />
            Опубликовать в LinkedIn
          </Checkbox>
        </Form.Item>
      </Form>
    </Edit>
  );
};
