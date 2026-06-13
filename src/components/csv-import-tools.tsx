"use client";

import { useActionState } from "react";
import { importAccountsCsvAction, importContactsCsvAction } from "@/app/actions";

type ImportState = {
  error?: string;
  success?: string;
  details?: string[];
  reportCsv?: string;
  reportFileName?: string;
} | null;

function ImportFeedback({ state }: { state: ImportState }) {
  if (!state) return null;

  return (
    <>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.success ? <div className="alert">{state.success}</div> : null}
      {state.details && state.details.length > 0 ? (
        <div className="row-card">
          <strong>Import details</strong>
          <div className="stack compact-stack">
            {state.details.map((detail) => (
              <div key={detail} className="deal-meta">
                {detail}
              </div>
            ))}
          </div>
          {state.reportCsv && state.reportFileName ? (
            <div className="inline-actions">
              <a
                className="secondary-button"
                download={state.reportFileName}
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(state.reportCsv)}`}
              >
                Download error report
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function CsvImportTools() {
  const [accountsState, accountsAction, accountsPending] = useActionState<ImportState, FormData>(
    importAccountsCsvAction,
    null,
  );
  const [contactsState, contactsAction, contactsPending] = useActionState<ImportState, FormData>(
    importContactsCsvAction,
    null,
  );

  return (
    <div className="stack">
      <form action={accountsAction} className="stack">
        <label className="field">
          <span>Import accounts CSV</span>
          <input name="csvFile" className="input" type="file" accept=".csv,text/csv" required />
        </label>
        <button type="submit" className="primary-button" disabled={accountsPending}>
          {accountsPending ? "Importing accounts..." : "Import accounts"}
        </button>
        <ImportFeedback state={accountsState} />
      </form>

      <form action={contactsAction} className="stack">
        <label className="field">
          <span>Import contacts CSV</span>
          <input name="csvFile" className="input" type="file" accept=".csv,text/csv" required />
        </label>
        <button type="submit" className="secondary-button" disabled={contactsPending}>
          {contactsPending ? "Importing contacts..." : "Import contacts"}
        </button>
        <ImportFeedback state={contactsState} />
      </form>
    </div>
  );
}
