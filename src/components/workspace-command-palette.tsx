"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CommandItem = {
  label: string;
  description: string;
  href: string;
};

const commands: CommandItem[] = [
  { label: "Dashboard", description: "Open the executive dashboard", href: "/dashboard" },
  { label: "Customers", description: "Open the customer workspace", href: "/customers" },
  { label: "Follow-ups", description: "Open the task queue", href: "/follow-ups" },
  { label: "Team", description: "Open team management and workspace settings", href: "/settings" },
  { label: "Search workspace", description: "Search customers, people, deals, and more", href: "/search" },
];

export function WorkspaceCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (!isInput && event.key === "/") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  const filteredCommands = commands.filter((command) => {
    const haystack = `${command.label} ${command.description}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div className="workspace-command-palette">
      <button type="button" className="secondary-button" onClick={() => setOpen(true)}>
        Command
      </button>
      {open ? (
        <div className="workspace-command-dialog" role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="workspace-command-card">
            <div className="workspace-command-header">
              <div>
                <strong>Command palette</strong>
                <div className="deal-meta">Jump to a page or common action.</div>
              </div>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <input
              ref={inputRef}
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type to search commands..."
            />
            <div className="workspace-command-list">
              {filteredCommands.map((command) => (
                <button
                  key={command.href}
                  type="button"
                  className="workspace-command-item"
                  onClick={() => navigate(command.href)}
                >
                  <strong>{command.label}</strong>
                  <span>{command.description}</span>
                </button>
              ))}
              {filteredCommands.length === 0 ? (
                <div className="empty-state">No commands match this search.</div>
              ) : null}
            </div>
            <div className="workspace-command-footer">
              <div className="deal-meta">
                Shortcuts: <strong>Cmd/Ctrl + K</strong> or <strong>/</strong>
              </div>
              <div className="workspace-command-shortcuts">
                <span>Customers</span>
                <span>Follow-ups</span>
                <span>Team</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <span className="command-shortcut-hint">⌘K</span>
    </div>
  );
}
