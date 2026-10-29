import { json, requireUser } from '@/lib/http';

export async function GET() {
  const user = await requireUser();
  return user instanceof Response ? user : json(user);
}
