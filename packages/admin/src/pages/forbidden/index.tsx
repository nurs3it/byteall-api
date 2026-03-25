import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export const ForbiddenPage = () => {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="У вас нет доступа к этой странице."
      extra={
        <Button type="primary" onClick={() => navigate('/login')}>
          Войти
        </Button>
      }
    />
  );
};
