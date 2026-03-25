import { AuthPage } from '@refinedev/antd';

export const LoginPage = () => {
  return (
    <AuthPage
      type="login"
      title="ByteAll Admin"
      formProps={{
        initialValues: { email: '', password: '' },
      }}
    />
  );
};
