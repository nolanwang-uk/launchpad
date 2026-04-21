import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

const LABEL = "block text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-1.5";
const INPUT_BASE = [
  "w-full min-h-[44px] px-3 py-2.5",
  "bg-[color:var(--color-bg-elevated)]",
  "border border-[color:var(--color-border-strong)]",
  "focus:border-[color:var(--color-accent)]",
  "text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)]",
  "text-[15px] leading-tight",
  "outline-none transition-colors",
].join(" ");
const INPUT_AREA = INPUT_BASE.replace(
  "leading-tight",
  "leading-relaxed",
) + " resize-y";

type TextProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean;
  help?: string;
};

export function TextField({ label, required, help, ...rest }: TextProps) {
  return (
    <label className="block">
      <span className={LABEL}>
        {label}
        {required && <span className="text-[color:var(--color-accent)]"> *</span>}
      </span>
      <input type="text" {...rest} className={INPUT_BASE} />
      {help && (
        <span className="block text-xs text-[color:var(--color-fg-subtle)] mt-1.5 leading-relaxed">
          {help}
        </span>
      )}
    </label>
  );
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  required?: boolean;
  help?: string;
};

export function TextArea({ label, required, help, ...rest }: AreaProps) {
  return (
    <label className="block">
      <span className={LABEL}>
        {label}
        {required && <span className="text-[color:var(--color-accent)]"> *</span>}
      </span>
      <textarea {...rest} className={INPUT_AREA} />
      {help && (
        <span className="block text-xs text-[color:var(--color-fg-subtle)] mt-1.5 leading-relaxed">
          {help}
        </span>
      )}
    </label>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  required?: boolean;
  help?: string;
  options: { value: string; label: string }[];
};

export function SelectField({
  label,
  required,
  help,
  options,
  ...rest
}: SelectProps) {
  return (
    <label className="block">
      <span className={LABEL}>
        {label}
        {required && <span className="text-[color:var(--color-accent)]"> *</span>}
      </span>
      <select
        {...rest}
        className={[
          INPUT_BASE,
          "appearance-none pr-9",
          "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20d%3D%22M3%204.5L6%207.5L9%204.5%22%20stroke%3D%22%236a6864%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')]",
          "bg-[length:12px_12px] bg-no-repeat bg-[right_12px_center]",
        ].join(" ")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && (
        <span className="block text-xs text-[color:var(--color-fg-subtle)] mt-1.5 leading-relaxed">
          {help}
        </span>
      )}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="text-sm text-[#b04141] border border-[#b04141]/40 bg-[#fdf2f2] px-3 py-2"
    >
      {message}
    </div>
  );
}

export function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center",
        "min-h-[48px] px-6 py-3",
        "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
        "hover:bg-[color:var(--color-accent-hover)]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "transition-colors font-medium tracking-[0.02em] text-sm md:text-base",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
