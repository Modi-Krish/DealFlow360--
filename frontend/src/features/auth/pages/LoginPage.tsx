import { LoginForm } from '../components/LoginForm';

export const LoginPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-text-main">
          DealFlow360
        </h2>
        <p className="mt-2 text-center text-sm text-text-muted">
          Intelligent B2B Sales Operations Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="card py-8 px-6 sm:px-10 shadow-sm border border-border-light">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};
