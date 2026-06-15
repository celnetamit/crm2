import { redirect } from "next/navigation";

export default async function CustomerAliasPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  redirect(`/accounts/${accountId}`);
}
