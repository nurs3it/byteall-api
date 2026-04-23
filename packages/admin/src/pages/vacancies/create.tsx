import { Create, useForm } from '@refinedev/antd';
import { Form, Input, Select, InputNumber, Switch, Row, Col, Button } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const StringListField = ({ label, name }: { label: string; name: string }) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>{label}</div>
        {fields.map((field) => (
          <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
            <Col flex="auto">
              <Form.Item {...field} noStyle>
                <Input placeholder={`${label} пункт`} />
              </Form.Item>
            </Col>
            <Col>
              <MinusCircleOutlined onClick={() => remove(field.name)} style={{ marginTop: 8 }} />
            </Col>
          </Row>
        ))}
        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
          Добавить
        </Button>
      </>
    )}
  </Form.List>
);

export const VacancyCreate = () => {
  const { formProps, saveButtonProps, form } = useForm({ resource: 'vacancies/admin' });

  return (
    <Create
      title="Создать вакансию"
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
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{ status: 'draft', type: 'Full-time', isNew: true, sortOrder: 0 }}
      >
        <Form.Item name="status" hidden><Input /></Form.Item>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="title" label="Название вакансии" rules={[{ required: true }]}>
              <Input placeholder="Full-Stack Developer" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="department" label="Отдел" rules={[{ required: true }]}>
              <Input placeholder="Software" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="location" label="Локация" rules={[{ required: true }]}>
              <Input placeholder="Astana, Kazakhstan" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="type" label="Тип занятости">
              <Select options={[
                { value: 'Full-time', label: 'Full-time' },
                { value: 'Part-time', label: 'Part-time' },
                { value: 'Contract', label: 'Contract' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="sortOrder" label="Порядок">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="isNew" label="New" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Краткое описание" rules={[{ required: true }]}>
          <Input.TextArea rows={3} placeholder="Короткое описание для карточки вакансии" />
        </Form.Item>

        <Form.Item name="about" label="О роли (подробно)">
          <Input.TextArea rows={5} placeholder="Подробное описание роли" />
        </Form.Item>

        <StringListField label="Обязанности" name="responsibilities" />
        <div style={{ height: 16 }} />

        <StringListField label="Требования" name="requirements" />
        <div style={{ height: 16 }} />

        <StringListField label="Будет плюсом" name="niceToHave" />
      </Form>
    </Create>
  );
};
