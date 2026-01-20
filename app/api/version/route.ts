import { NextResponse } from "next/server"

/**
 * API эндпоинт для получения текущей версии приложения
 * Используется для live-проверки обновлений на клиенте
 */
export async function GET() {
  const version =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    "dev"

  return NextResponse.json({ version })
}
