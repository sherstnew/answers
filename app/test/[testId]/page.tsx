import { getTest } from '@/lib/utils';
import TestPageClient from './TestPageClient';

export default async function TestPage({ params }: { params: Promise<{ testId: string }> }) {
  const resolvedParams = await params;
  const testId = parseInt(resolvedParams.testId, 10);

  if (isNaN(testId)) {
    throw new Error('Invalid testId');
  }

  const test = await getTest(testId);

  return <TestPageClient test={test} />;
}