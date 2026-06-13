import { exportAccountsCsv } from "@/lib/crm";

export async function POST(request: Request) {
  const formData = await request.formData();
  const accountIds = formData
    .getAll("accountIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (accountIds.length === 0) {
    return new Response("Select at least one account first.", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const csv = await exportAccountsCsv(accountIds);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="accounts-selected.csv"',
    },
  });
}
