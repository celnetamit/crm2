import { stringifyCsv } from "@/lib/csv";

export async function GET() {
  const csv = stringifyCsv([
    {
      accountName: "Aster Biotech",
      name: "Dr. Ramesh Kulkarni",
      role: "Procurement",
      title: "Head Librarian",
      department: "Knowledge Services",
      influenceLevel: "Champion",
      preferredChannel: "Email",
      linkedinUrl: "https://linkedin.com/in/example",
      email: "ramesh@aster.example",
      phone: "+91-9000000000",
      notes: "Prefers short summary emails before procurement meetings.",
    },
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contacts-template.csv"',
    },
  });
}
