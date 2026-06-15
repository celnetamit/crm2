type HelpTipProps = {
  label: string;
};

export function HelpTip({ label }: HelpTipProps) {
  return (
    <span className="help-tip" title={label} aria-label={label}>
      i
    </span>
  );
}
