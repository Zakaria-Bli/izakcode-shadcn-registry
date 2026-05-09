"use client"

import { LockKeyhole, Mail, User } from "lucide-react"
import * as React from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"

import { FieldGroup } from "@/components/ui/field"
import { GenericInput } from "@/components/ui/generic-input"

function PreviewCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose bg-card text-card-foreground rounded-xl border p-4 sm:p-6">
      {children}
    </div>
  )
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium shadow-xs transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function SubmittedValue({ value }: { value: unknown }) {
  return (
    <pre className="bg-muted mt-4 overflow-x-auto rounded-md p-3 text-xs leading-6">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export function BasicGenericInputDemo() {
  const form = useForm<{ contactEmail: string }>({
    defaultValues: { contactEmail: "" },
  })
  const [submitted, setSubmitted] = React.useState<{ contactEmail: string } | null>(null)

  return (
    <PreviewCard>
      <FormProvider {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => setSubmitted(values))}
        >
          <FieldGroup>
            <GenericInput
              name="contactEmail"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              description={
                'Because no label prop is provided, the component derives "Contact Email" from the field name.'
              }
              required
            />
          </FieldGroup>

          <SubmitButton>Save email</SubmitButton>
        </form>
      </FormProvider>

      <SubmittedValue value={submitted ?? { contactEmail: "" }} />
    </PreviewCard>
  )
}

export function OptionalGenericInputDemo() {
  const form = useForm<{ displayName: string }>({
    defaultValues: { displayName: "" },
  })

  return (
    <PreviewCard>
      <FormProvider {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(() => undefined)}>
          <FieldGroup>
            <GenericInput
              name="displayName"
              label="Display name"
              placeholder="Izak Code"
              description="Optional fields can opt in to a label annotation without changing validation rules."
              optionalLabel="Optional"
              icon={<User className="size-4" />}
            />
          </FieldGroup>

          <SubmitButton>Continue</SubmitButton>
        </form>
      </FormProvider>
    </PreviewCard>
  )
}

export function PasswordGenericInputDemo() {
  const form = useForm<{ password: string }>({
    defaultValues: { password: "" },
  })

  return (
    <PreviewCard>
      <FormProvider {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(() => undefined)}>
          <FieldGroup>
            <GenericInput
              name="password"
              type="password"
              label="Password"
              placeholder="Enter a strong password"
              description="The built-in toggle swaps between masked and unmasked text while keeping the input registered."
              showPasswordLabel="Show password"
              hidePasswordLabel="Hide password"
              required
            />
          </FieldGroup>

          <SubmitButton>Create account</SubmitButton>
        </form>
      </FormProvider>
    </PreviewCard>
  )
}

export function NumericGenericInputDemo() {
  const form = useForm<{ age: number | null }>({
    defaultValues: { age: null },
  })
  const age = useWatch({ control: form.control, name: "age" })

  return (
    <PreviewCard>
      <FormProvider {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(() => undefined)}>
          <FieldGroup>
            <GenericInput
              name="age"
              type="number"
              label="Age"
              placeholder="42"
              step="1"
              min={0}
              returnAsNumber
              description="With returnAsNumber enabled, empty and invalid values resolve to null instead of an empty string."
            />
          </FieldGroup>
        </form>
      </FormProvider>

      <SubmittedValue value={{ age: age ?? null }} />
    </PreviewCard>
  )
}

export function ComposedGenericInputDemo() {
  const form = useForm<{
    fullName: string
    email: string
    password: string
  }>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  })
  const [submitted, setSubmitted] = React.useState<{
    fullName: string
    email: string
    password: string
  } | null>(null)

  return (
    <PreviewCard>
      <FormProvider {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => setSubmitted(values))}
        >
          <FieldGroup>
            <GenericInput
              name="fullName"
              label="Full name"
              placeholder="Ada Lovelace"
              icon={<User className="size-4" />}
              required
            />
            <GenericInput
              name="email"
              type="email"
              placeholder="ada@example.com"
              autoComplete="email"
              icon={<Mail className="size-4" />}
              required
            />
            <GenericInput
              name="password"
              type="password"
              placeholder="Choose a password"
              icon={<LockKeyhole className="size-4" />}
              required
            />
          </FieldGroup>

          <SubmitButton>Create account</SubmitButton>
        </form>
      </FormProvider>

      <SubmittedValue value={submitted ?? { fullName: "", email: "", password: "" }} />
    </PreviewCard>
  )
}
