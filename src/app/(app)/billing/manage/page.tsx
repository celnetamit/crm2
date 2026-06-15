import type { ReactElement } from "react";
import BillingPage from "../page";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BillingManagePage({
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
  params.set("mode", "single");
  params.set("tab", "manage");
  const renderPage = BillingPage as unknown as (props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }) => Promise<ReactElement>;
  return await renderPage({ searchParams: Promise.resolve(Object.fromEntries(params.entries())) });
}
