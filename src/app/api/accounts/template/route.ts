import { stringifyCsv } from "@/lib/csv";

export async function GET() {
  const csv = stringifyCsv([
    {
      ownerEmail: "owner@crm2.local",
      name: "Aster Biotech",
      industry: "Biotech",
      website: "https://aster.example",
      status: "ACTIVE",
      lifecycleStage: "Active Customer",
      segment: "Enterprise",
      source: "Referral",
      tags: "Renewal,Expansion",
      profileSummary: "High-value research customer with expansion potential.",
      headquarters: "Bengaluru, India",
      companySize: "200-500 employees",
      annualRevenue: "12000000",
      healthScore: "82",
      nextReviewAt: "2026-07-15",
      customFields: "{\"Region\":\"South India\",\"RenewalMonth\":\"October\"}",
      notes: "Primary champion is supportive and renewal planning has started.",
    },
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="accounts-template.csv"',
    },
  });
}
