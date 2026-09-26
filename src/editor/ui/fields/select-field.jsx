// Labeled dropdown. `options`: [[value, label]] or groups [{ label, options }].
export function SelectField({ label, value, onChange, options, disabled, title }) {
  const render = (list) => list.map(([v, text]) => <option key={v} value={v}>{text}</option>);
  return (
    <label className="ae-field" title={title}>
      {label && <span className="ae-field-label">{label}</span>}
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options[0]?.options
          ? options.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {render(group.options)}
              </optgroup>
            ))
          : render(options)}
      </select>
    </label>
  );
}
