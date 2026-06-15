"use client";

import Link from "next/link";
import { useState } from "react";

export function WorkspaceQuickActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="workspace-quick-actions">
      <button type="button" className="secondary-button" onClick={() => setOpen((value) => !value)}>
        Quick actions
      </button>
      {open ? (
        <div className="workspace-quick-actions-menu" role="menu" aria-label="Quick actions">
          <Link href="/customers" className="workspace-quick-action" onClick={() => setOpen(false)}>
            New customer
          </Link>
          <Link href="/follow-ups" className="workspace-quick-action" onClick={() => setOpen(false)}>
            New follow-up
          </Link>
          <Link href="/settings" className="workspace-quick-action" onClick={() => setOpen(false)}>
            Team
          </Link>
          <Link href="/search" className="workspace-quick-action" onClick={() => setOpen(false)}>
            Search workspace
          </Link>
        </div>
      ) : null}
    </div>
  );
}
