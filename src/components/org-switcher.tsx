"use client";

import { useRef } from "react";

type OrganizationItem = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  role: string;
};

export function OrganizationSwitcher({
  organizations,
  currentOrganizationId,
  onSubmitAction,
}: {
  organizations: OrganizationItem[];
  currentOrganizationId: string;
  onSubmitAction: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={onSubmitAction} className="org-switcher">
      <label className="sr-only" htmlFor="organizationId">
        Organization
      </label>
      <select
        id="organizationId"
        name="organizationId"
        className="select select-compact"
        defaultValue={currentOrganizationId}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name} · {organization.role}
          </option>
        ))}
      </select>
    </form>
  );
}
