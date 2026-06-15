import { redirect } from "next/navigation";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectTasksPage({
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
  const query = params.toString();
  redirect(query ? `/follow-ups?${query}` : "/follow-ups");
}
