// Checkbox with a label.
export function CheckField({ label, checked, onChange, disabled, title }) {
  return (
    <label className="ae-check" title={title}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
