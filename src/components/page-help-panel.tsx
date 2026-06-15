import Link from "next/link";

type PageHelpPanelProps = {
  pageTitle: string;
  whatIsThis: string;
  whatCanIDoHere: string;
  commonActions: string[];
  relatedPages: Array<{ label: string; href: string }>;
};

export function PageHelpPanel({ pageTitle, whatIsThis, whatCanIDoHere, commonActions, relatedPages }: PageHelpPanelProps) {
  return (
    <section className="panel page-help-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Help</div>
          <h2>{pageTitle} guide</h2>
        </div>
      </div>
      <div className="page-help-grid">
        <div className="nested-card">
          <strong>What is this page?</strong>
          <div className="deal-meta">{whatIsThis}</div>
        </div>
        <div className="nested-card">
          <strong>What can I do here?</strong>
          <div className="deal-meta">{whatCanIDoHere}</div>
        </div>
        <div className="nested-card">
          <strong>Common actions</strong>
          <ul className="page-help-list">
            {commonActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
        <div className="nested-card">
          <strong>Related pages</strong>
          <div className="chip-row">
            {relatedPages.map((page) => (
              <Link key={page.href} href={page.href} className="secondary-button">
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
