import { exportContactsCsv } from "@/lib/crm";

export async function GET() {
  const csv = await exportContactsCsv();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contacts.csv"',
    },
  });
}
