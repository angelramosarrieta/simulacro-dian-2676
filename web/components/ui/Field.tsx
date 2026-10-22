import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({ label, hint, error, id, children, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string; id: string; children?: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children ?? <input id={id} className={`input ${error ? "border-bad focus:border-bad focus:ring-bad/20" : ""}`} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-[13px] text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
