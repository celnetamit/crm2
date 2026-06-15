"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TourStep = {
  title: string;
  body: string;
  href: string;
  actionLabel: string;
};

const tourSteps: TourStep[] = [
  {
    title: "Start on the dashboard",
    body: "Use the dashboard for a fast overview of customers, deals, billing, and follow-ups.",
    href: "/dashboard",
    actionLabel: "Open dashboard",
  },
  {
    title: "Move through customers and sales",
    body: "Use Customers to manage records, Deals to track opportunities, and Follow-ups to keep work moving.",
    href: "/customers",
    actionLabel: "Open customers",
  },
  {
    title: "Keep the team aligned",
    body: "Use Team to invite teammates, change roles, and confirm access before rollout.",
    href: "/settings",
    actionLabel: "Open team",
  },
];

const STORAGE_KEY = "crm2-workspace-tour-dismissed-v1";

export function WorkspaceTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timeoutId = window.setTimeout(() => {
        setOpen(true);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  const step = tourSteps[stepIndex];

  return (
    <div className="workspace-tour">
      <button type="button" className="secondary-button" onClick={() => setOpen(true)}>
        Take tour
      </button>
      {open ? (
        <div className="workspace-tour-card" role="dialog" aria-modal="true" aria-label="Workspace tour">
          <div className="workspace-tour-header">
            <div>
              <strong>Welcome to CRM2</strong>
              <div className="deal-meta">A short tour helps new users get oriented fast.</div>
            </div>
            <button type="button" className="secondary-button" onClick={dismiss}>
              Skip
            </button>
          </div>
          <div className="workspace-tour-step">
            <div className="workspace-tour-progress">
              {tourSteps.map((item, index) => (
                <span key={item.title} className={index <= stepIndex ? "is-active" : ""} />
              ))}
            </div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <div className="workspace-tour-actions">
              <Link href={step.href} className="primary-button" onClick={dismiss}>
                {step.actionLabel}
              </Link>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                disabled={stepIndex === 0}
              >
                Back
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (stepIndex === tourSteps.length - 1) {
                    dismiss();
                    return;
                  }
                  setStepIndex((value) => Math.min(tourSteps.length - 1, value + 1));
                }}
              >
                {stepIndex === tourSteps.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
