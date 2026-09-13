import { databaseProvider, db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: databaseProvider,
      dataApiConfigured: Boolean(process.env.NEON_DATA_API_URL),
    });
  } catch (error) {
    console.error("Database healthcheck failed", error);
    return Response.json(
      {
        ok: false,
        database: databaseProvider,
        error: "Database connection failed",
      },
      { status: 503 },
    );
  }
}
