// Row of mutually exclusive buttons. `options`: [[value, label, Icon?]].
export function Segmented({ label, value, onChange, options, disabled }) {
  return (
    <div className="ae-field">
      {label && <span className="ae-field-label">{label}</span>}
      <div className="ae-segmented" role="radiogroup" aria-label={label}>
        {options.map(([v, text, Icon]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={text}
            title={text}
            disabled={disabled}
            onClick={() => onChange(v)}
          >
            {Icon ? <Icon size={15} /> : text}
          </button>
        ))}
      </div>
    </div>
  );
}
