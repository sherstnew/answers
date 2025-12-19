import { getTest } from '@/lib/utils';
import TestPageClient from './TestPageClient';

export default async function TestPage({ params }: { params: Promise<{ testId: string }> }) {
  const resolvedParams = await params;
  const testId = parseInt(resolvedParams.testId, 10);

  if (isNaN(testId)) {
    throw new Error('Invalid testId');
  }

  try {
    const test = await getTest(testId);
    return <TestPageClient test={test} />;
  } catch (err: any) {
    if (err?.status === 401) {
      return (
        <div className="p-6 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-red-600">Ошибка авторизации</h1>
          <p className="mt-2">Доступ запрещён. Проверьте настройки в админ-панели.</p>
        </div>
      );
    }
    throw err;
  }
}