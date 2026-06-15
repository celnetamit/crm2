# CRM2 UX, IA, Navigation, and Naming Audit

This document translates the attached product brief into a CRM2-specific redesign plan based on the current app structure and routes.

## Executive Summary

CRM2 is functional, but the current structure makes users think in terms of internal data objects instead of everyday work.

The biggest issues are:

- Module names are still too technical in a few places.
- Navigation does not clearly separate customers, people, sales, follow-ups, and team setup.
- Many pages mix overview, editing, and creation in one long scroll.
- URLs are only partly standardized and still reflect legacy route names.
- Page-level guidance is limited, so new users have to infer where to start.

The good news is that the core product already contains the right data. The main opportunity is to reorganize and label it more clearly.

## Current Pain Points

### High Severity

- Users cannot quickly tell where to manage customers, people, follow-ups, deals, billing, or team access.
- Several pages still present card-heavy stacks where a table would be faster to scan and act on.
- Some actions are buried inside detail blocks, which makes common workflows feel hidden.
- The navigation language is inconsistent across surfaces.

### Medium Severity

- Dashboard shortcuts are helpful, but not yet a full task-based navigation model.
- Some routes still use legacy names like `accounts`, which are meaningful to the system but less intuitive to users.
- There is no global help center or contextual onboarding content.

### Low Severity

- Button labels are mostly clear now, but some action menus still need a final consistency pass.
- Certain page titles and section names can be shortened further.

## Recommended Information Architecture

### Primary Navigation

- Dashboard
- Customers
- Sales
- Follow-ups
- Billing
- Team
- Reports
- Settings

### Secondary Navigation

- Customers
  - All Customers
  - People
  - Segments
  - Customer Detail
- Sales
  - Deals
  - Pipeline
  - Quotes
- Follow-ups
  - All Follow-ups
  - Due Today
  - Completed
- Billing
  - Invoices
  - Customers
  - Payment Status
- Team
  - Members
  - Invites
  - Directory
  - Organization
- Settings
  - Workspace
  - Users
  - Roles
  - Integrations

### Breadcrumb Pattern

- Dashboard
- Customers / All Customers / Customer Name
- Sales / Deals / Deal Name
- Follow-ups / Follow-up Title
- Billing / Invoices / Invoice Number
- Team / Members / Person Name
- Settings / Organization

## Navigation Redesign

### Recommended App Flow

```text
Login
  |
  v
Dashboard
  |
  +--> Customers
  |      +--> All Customers
  |      +--> People
  |      +--> Customer Detail
  |
  +--> Sales
  |      +--> Deals
  |      +--> Pipeline
  |
  +--> Follow-ups
  |      +--> All Follow-ups
  |      +--> Due Today
  |
  +--> Billing
  |      +--> Invoices
  |      +--> Customer Billing
  |
  +--> Team
  |      +--> Members
  |      +--> Invites
  |
  +--> Settings
         +--> Workspace
         +--> Roles
         +--> Integrations
```

### Quick Action Menu

Recommended global quick actions:

- Add Customer
- Add Person
- Create Deal
- Create Follow-up
- Create Invoice
- Invite Teammate

### Global Search

Search should return:

- Customers
- People
- Deals
- Follow-ups
- Invoices
- Team members

Search should support:

- direct entity lookup
- type filters
- recent items
- keyboard shortcut access

## Naming Audit

### Strong Current Names

- Dashboard
- Customers
- People
- Follow-ups
- Billing
- Team
- Pipeline

### Names To Keep Shorter or More Explicit

| Current Name | Recommended Name | Reason |
| --- | --- | --- |
| Accounts | Customers | Matches user language |
| Contacts | People | Shorter and clearer |
| Tasks | Follow-ups | Better describes the work |
| Members | Team | Easier for non-admin users |
| Deal board | Deals / Pipeline | Clearer split between table and board |
| Team access | Team | Redundant title can be simplified |
| Registered users | Directory | Cleaner label for a reference list |

### Button Label Rules

- Use verbs only.
- Keep labels to 1 to 3 words.
- Prefer `Add Customer`, `Create Deal`, `Invite Teammate`, `Send Email`, `Export CSV`, `Save Changes`.
- Avoid generic labels like `Submit` unless the action is obvious from context.

## URL Standardization

### Recommended Canonical URLs

| Current URL | Recommended URL |
| --- | --- |
| `/` | `/dashboard` |
| `/accounts` | `/customers` |
| `/accounts/{id}` | `/customers/{id}` |
| `/deals` | `/sales/deals` or `/sales/opportunities` |
| `/tasks` | `/follow-ups` |
| `/billing` | `/billing` |
| `/settings` | `/team` or `/settings` |
| `/automation` | `/communications` or `/automation` depending on product scope |

### URL Rules

- Use lowercase, hyphen-free primary slugs where possible.
- Keep route names aligned with user language.
- Use nested routes for detail views and sub-areas.
- Preserve old routes as redirects if renaming is introduced.

## Dashboard Redesign

### Top Section

- Welcome message
- Global search
- Quick actions

### KPI Section

- Customers
- Revenue
- Active projects or open deals
- Open follow-ups

### Activity Section

- Recent updates
- Team activity
- Recent customer changes

### Alerts Section

- Tasks due
- Pending approvals
- Notifications

## Workflow Improvements

### Customer Creation

Current:

```text
Customers -> Add -> Form -> Save -> Profile
```

Recommended:

```text
Add Customer -> Quick Form -> Save -> Customer Profile
```

### Lead or Deal Conversion

Recommended visible progress:

```text
Lead -> Qualified -> Opportunity -> Customer
```

### Follow-up Management

Recommended flow:

```text
Follow-up -> Assign -> Due Date -> Complete
```

### Billing Workflow

Recommended flow:

```text
Invoice -> Review -> Send -> Track Payment -> Close
```

## Page-Level Help System

Every page should answer:

- What is this page?
- What can I do here?
- What are the common actions?
- Where do I go next?

### Help Components

- First-time product tour
- Page-level help panel
- Tooltips for complex filters and statuses
- Help center with FAQs and tutorials

### Suggested Page Help Copy

#### Customers

- What is this page?
  - A list of customers and the people attached to them.
- What can I do here?
  - Search, open, edit, and review customer activity.
- Common actions
  - Add customer, edit details, open follow-ups, view people.

#### Sales

- What is this page?
  - A table and board for active opportunities.
- What can I do here?
  - Track value, stage, owner, and next steps.
- Common actions
  - View deal, edit deal, move stage, open follow-ups.

#### Billing

- What is this page?
  - A billing workspace for invoices and payment status.
- What can I do here?
  - Review documents, customer balances, and payment progress.
- Common actions
  - Open invoice, edit invoice, follow up, mark paid.

#### Team

- What is this page?
  - A workspace for members, invites, and account access.
- What can I do here?
  - Manage roles, invite teammates, review directory access.
- Common actions
  - Update role, invite teammate, revoke invite.

## Help Center Structure

- Getting Started
  - Login
  - Navigation
  - Dashboard
- Managing Customers
  - Create
  - Search
  - Edit
- Managing Sales
  - Add Deal
  - Move Pipeline Stages
  - Track Follow-ups
- Managing Billing
  - Create Invoice
  - Track Payment
  - Resolve Overdue Items
- Team and Settings
  - Users
  - Roles
  - Invites
  - Integrations

## UX Audit Report

### Quick Wins

- Standardize labels across navigation and page titles.
- Keep the table-and-tabs treatment on customer, sales, billing, and team pages.
- Add page-level help blocks.
- Add better empty states and action guidance.
- Tighten button labels and secondary action menus.

### Medium Improvements

- Introduce a true global search.
- Add breadcrumbs.
- Add saved views and column controls to tables.
- Add a quick action menu in the header.
- Add contextual tooltips for filters and statuses.

### Strategic Enhancements

- Rename legacy routes to match user language.
- Add a full help center with tutorials and documentation.
- Add onboarding tour and first-run checklists.
- Add workflow progress indicators for sales and onboarding.
- Add analytics-oriented dashboards by role.

## Prioritized Roadmap

### 1 to 2 Weeks

- Finish label harmonization across all pages.
- Add consistent table views and action menus where lists still use cards.
- Add page help text blocks to the main workspace pages.
- Improve empty states and helper copy.

### 1 to 2 Months

- Add global search.
- Add breadcrumbs and a quick action menu.
- Add saved views and table column controls.
- Introduce a help center section in the app.
- Add keyboard shortcuts for common actions.

### 3 to 6 Months

- Standardize URLs and add redirects from legacy paths.
- Redesign onboarding for the first-time user journey.
- Add richer analytics and role-specific dashboards.
- Expand help content into tutorials and guided walkthroughs.

## Final Recommendation

CRM2 should present itself as:

- Customers
- Sales
- Follow-ups
- Billing
- Team
- Settings

That language is clear, short, and aligned with how users actually think. The current codebase already contains most of the needed data and workflows. The main product work is to make the structure visible, searchable, and predictable.
