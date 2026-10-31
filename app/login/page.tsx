import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentUser } from '@/lib/auth';
import { enabledProviders } from '@/lib/oauth';

const OAUTH_ERRORS: Record<string, string> = {
  cancelled: 'ยกเลิกการเข้าสู่ระบบแล้ว',
  state: 'เซสชันการเข้าสู่ระบบหมดอายุ ลองใหม่อีกครั้ง',
  provider: 'ยังไม่ได้เปิดใช้การเข้าสู่ระบบช่องทางนี้',
  oauth: 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect('/');
  const { error } = await searchParams;
  return <AuthForm providers={enabledProviders()} initialError={error ? OAUTH_ERRORS[error] ?? OAUTH_ERRORS.oauth : ''} />;
}
