import { AuthLayout } from '../../../shared/components/layout/AuthLayout';
import { VerifyForm } from '../components/VerifyForm';

export function VerifyPage() {
  return (
    <AuthLayout>
      <VerifyForm />
    </AuthLayout>
  );
}