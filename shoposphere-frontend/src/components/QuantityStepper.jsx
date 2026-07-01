import { useEffect, useState } from "react";

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  className = "inline-flex items-center gap-3",
  decrementClassName = "",
  incrementClassName = "",
  decrementStyle,
  incrementStyle,
  inputClassName = "w-10 text-center bg-transparent border-0 outline-none focus:ring-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
  inputStyle,
  decrementLabel = "Decrease quantity",
  incrementLabel = "Increase quantity",
}) {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const clamp = (n) => {
    let next = Number.isNaN(n) || n < min ? min : n;
    if (typeof max === "number") next = Math.min(max, next);
    return next;
  };

  const commitInput = (raw) => {
    const parsed = parseInt(String(raw).trim(), 10);
    const next = clamp(parsed);
    onChange(next);
    setInputValue(String(next));
  };

  return (
    <div className={className}>
      <button
        type="button"
        aria-label={decrementLabel}
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        className={decrementClassName}
        style={decrementStyle}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={inputValue}
        disabled={disabled}
        aria-label="Quantity"
        onChange={(e) => {
          const next = e.target.value;
          if (next === "" || /^\d+$/.test(next)) setInputValue(next);
        }}
        onBlur={() => commitInput(inputValue)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={inputClassName}
        style={inputStyle}
      />
      <button
        type="button"
        aria-label={incrementLabel}
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || (typeof max === "number" && value >= max)}
        className={incrementClassName}
        style={incrementStyle}
      >
        +
      </button>
    </div>
  );
}
