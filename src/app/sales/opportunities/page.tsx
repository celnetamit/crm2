import { redirect } from "next/navigation";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SalesOpportunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    const nextValue = firstValue(value);
    if (nextValue) params.set(key, nextValue);
  }
  if (!params.get("tab")) params.set("tab", "deals");
  redirect(`/deals?${params.toString()}`);
}
