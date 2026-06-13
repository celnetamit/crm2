import { exportAccountsCsv } from "@/lib/crm";

export async function GET() {
  const csv = await exportAccountsCsv();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="accounts.csv"',
    },
  });
}
