"use client"

import { Eye, EyeOff } from "lucide-react"
import * as React from "react"
import { FieldValues, Path, useFormContext } from "react-hook-form"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type GenericInputProps<TFieldValues extends FieldValues> = Omit<
  React.ComponentProps<"input">,
  "name" | "onChange" | "onBlur"
> & {
  name: Path<TFieldValues>
  label?: React.ReactNode
  description?: React.ReactNode
  required?: boolean
  /**
   * Label appended to the field label when the field is not required.
   * Pass `null` (or an empty string) to suppress the label entirely (useful for dense forms where
   * every field is optional and the annotation would be redundant).
   * Defaults to `null` — you must opt in by passing e.g. `optionalLabel="Optional"`.
   */
  optionalLabel?: React.ReactNode | null
  /**
   * Visually disables the input without clearing its value on submit.
   *
   * Unlike passing `disabled` directly to react-hook-form's `register()`,
   * this prop only sets the native `disabled` attribute on the `<input>`
   * element. The field value is preserved in form state and included in
   * submitted data.
   *
   * @default false
   */
  disabled?: boolean
  /**
   * When `true`, coerces the input value to a `number` via `setValueAs`.
   * Empty strings and non-numeric values resolve to `null`.
   *
   * @default false
   */
  returnAsNumber?: boolean
  icon?: React.ReactNode
  showPasswordLabel?: string
  hidePasswordLabel?: string
  /** Forwarded to react-hook-form's `register()` onChange handler. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  /** Forwarded to react-hook-form's `register()` onBlur handler. */
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}

/**
 * Derives a human-readable label from a react-hook-form field path.
 *
 * - Splits on `.` and discards pure-numeric segments (array indices).
 * - Falls back to the last segment if every segment is numeric.
 * - Returns the generic string "Field" only as a last resort; callers should
 *   always supply an explicit `label` prop for paths that might resolve poorly.
 */
function getLabelFromName(name: string): string {
  const segments = name.split(".")
  // Prefer the last non-numeric segment so "items.0.firstName" → "First Name"
  const lastMeaningful = segments.findLast((s) => !/^\d+$/.test(s)) ?? segments.at(-1) ?? name

  const formatted = lastMeaningful
    .replace(/\[.*?\]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d+)/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

  return formatted || "Field"
}

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node)
      } else if (ref != null) {
        ;(ref as React.RefObject<T | null>).current = node
      }
    }
  }
}

/**
 * A reusable form input that integrates with react-hook-form via `useFormContext`.
 *
 * Must be rendered inside a `FormProvider`. Supports label auto-generation,
 * description, error display, leading icons, password visibility toggle,
 * and numeric value coercion.
 *
 * @example
 * // Basic usage
 * <GenericInput<MyFormValues> name="email" required />
 *
 * @example
 * // Show "Optional" annotation on non-required fields
 * <GenericInput<MyFormValues> name="nickname" optionalLabel="Optional" />
 *
 * @example
 * // Suppress the optional annotation entirely
 * <GenericInput<MyFormValues> name="middleName" optionalLabel={null} />
 */
export function GenericInput<TFieldValues extends FieldValues>({
  name,
  ref,
  id,
  label,
  className,
  required,
  // Default to null so optional labels are opt-in, not opt-out.
  // Consumers who want the annotation must pass e.g. optionalLabel="Optional".
  optionalLabel = null,
  disabled = false,
  description,
  returnAsNumber = false,
  icon,
  type,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
  onBlur,
  onChange,
  ...props
}: GenericInputProps<TFieldValues>) {
  // Guard: fail fast with a clear developer error if this component
  // is accidentally used outside a FormProvider.
  const form = useFormContext<TFieldValues>()
  if (!form) {
    throw new Error(
      "<GenericInput> must be rendered inside a react-hook-form <FormProvider>. " +
        `No FormProvider was found in the component tree for field "${name}".`
    )
  }

  const { register, formState } = form
  const [showPassword, setShowPassword] = React.useState(false)

  const togglePassword = React.useCallback(() => setShowPassword((current) => !current), [])

  const fieldName = name as string
  const inputId = id ?? fieldName
  const fieldState = form.getFieldState(name, formState)
  const fieldError = fieldState.error
  const errorId = fieldError ? `${inputId}-error` : undefined
  const descriptionId = description ? `${inputId}-description` : undefined
  const isPasswordField = type === "password"
  const inputType = isPasswordField && showPassword ? "text" : type
  const shouldRenderOptionalLabel =
    !required &&
    optionalLabel != null &&
    (typeof optionalLabel !== "string" || optionalLabel.trim().length > 0)
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ")

  const { ref: registerRef, ...restRegistration } = register(name, {
    onBlur,
    onChange,
    required,
    setValueAs: returnAsNumber
      ? (value) => {
          if (typeof value === "string" && value.trim() === "") {
            return null
          }
          const numericValue = Number(value)
          return Number.isNaN(numericValue) ? null : numericValue
        }
      : undefined,
  })

  return (
    <Field data-disabled={disabled ? true : undefined} data-invalid={fieldError ? true : undefined}>
      <FieldLabel htmlFor={inputId} className="flex items-center gap-1">
        {label ?? getLabelFromName(fieldName)}
        {required ? (
          <span className="text-destructive" aria-label="required">
            *
          </span>
        ) : shouldRenderOptionalLabel ? (
          <span className="text-muted-foreground" aria-label="optional">
            {optionalLabel}
          </span>
        ) : null}
      </FieldLabel>

      <div className="relative">
        {icon ? (
          <div className="text-muted-foreground pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        ) : null}
        <Input
          id={inputId}
          ref={mergeRefs(ref, registerRef)}
          type={inputType}
          className={cn(icon && "ps-10", isPasswordField && "pe-10", className)}
          disabled={disabled}
          aria-required={required || undefined}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...props}
          {...restRegistration}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={togglePassword}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground absolute inset-e-3 top-1/2 -translate-y-1/2 transition-colors disabled:pointer-events-none disabled:opacity-50"
            aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
            aria-pressed={showPassword}
            aria-controls={inputId}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>

      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}

      {fieldError ? <FieldError id={errorId} errors={[fieldError]} /> : null}
    </Field>
  )
}
