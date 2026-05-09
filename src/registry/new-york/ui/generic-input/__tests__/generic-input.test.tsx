import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"

import { GenericInput } from "@/registry/new-york/ui/generic-input/generic-input"

type HarnessProps<TValues extends FieldValues> = {
  defaultValues?: FieldValues
  onFormReady?: (form: UseFormReturn<TValues>) => void
  children: (form: UseFormReturn<TValues>) => React.ReactNode
}

function FormHarness<TValues extends FieldValues = FieldValues>({
  defaultValues,
  onFormReady,
  children,
}: HarnessProps<TValues>) {
  const form = useForm<TValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: defaultValues as any,
    mode: "onSubmit",
  }) as UseFormReturn<TValues>

  React.useEffect(() => {
    onFormReady?.(form)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <FormProvider {...form}>{children(form)}</FormProvider>
}

describe("GenericInput", () => {
  describe("label auto-generation", () => {
    it("renders an explicit label when provided", () => {
      render(<FormHarness>{() => <GenericInput name="email" label="Email Address" />}</FormHarness>)
      expect(screen.getByText("Email Address")).toBeInTheDocument()
    })

    it("derives label from camelCase name", () => {
      render(<FormHarness>{() => <GenericInput name="firstName" />}</FormHarness>)
      expect(screen.getByText("First Name")).toBeInTheDocument()
    })

    it("derives label from snake_case and kebab-case names", () => {
      const { rerender } = render(
        <FormHarness>{() => <GenericInput name="user_email" />}</FormHarness>
      )
      expect(screen.getByText("User Email")).toBeInTheDocument()

      rerender(<FormHarness>{() => <GenericInput name="user-email" />}</FormHarness>)
      expect(screen.getByText("User Email")).toBeInTheDocument()
    })

    it("uses the last meaningful segment from a dotted path", () => {
      render(<FormHarness>{() => <GenericInput name="profile.contactEmail" />}</FormHarness>)
      expect(screen.getByText("Contact Email")).toBeInTheDocument()
    })

    it("skips numeric segments (array indices) in dotted paths", () => {
      render(<FormHarness>{() => <GenericInput name="items.0.productName" />}</FormHarness>)
      expect(screen.getByText("Product Name")).toBeInTheDocument()
    })

    it("inserts spaces between letters and digits", () => {
      render(<FormHarness>{() => <GenericInput name="address1" />}</FormHarness>)
      expect(screen.getByText("Address 1")).toBeInTheDocument()
    })
  })

  describe("react-hook-form integration", () => {
    it("registers the field and updates form state on change", async () => {
      let formRef: UseFormReturn<{ email: string }> | undefined

      render(
        <FormHarness<{ email: string }>
          defaultValues={{ email: "" }}
          onFormReady={(f) => (formRef = f)}
        >
          {() => <GenericInput name="email" />}
        </FormHarness>
      )

      const input = screen.getByRole("textbox") as HTMLInputElement
      fireEvent.change(input, { target: { value: "hello@example.com" } })

      await waitFor(() => {
        expect(formRef!.getValues("email")).toBe("hello@example.com")
      })
    })

    it("forwards onChange and onBlur handlers", () => {
      const onChange = vi.fn()
      const onBlur = vi.fn()

      render(
        <FormHarness defaultValues={{ email: "" }}>
          {() => <GenericInput name="email" onChange={onChange} onBlur={onBlur} />}
        </FormHarness>
      )

      const input = screen.getByRole("textbox")
      fireEvent.change(input, { target: { value: "x" } })
      fireEvent.blur(input)

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onBlur).toHaveBeenCalledTimes(1)
    })

    it("returns a string when type is number by default", async () => {
      let formRef: UseFormReturn<{ age: string | undefined }> | undefined

      render(
        <FormHarness<{ age: string | undefined }>
          defaultValues={{ age: undefined }}
          onFormReady={(f) => (formRef = f)}
        >
          {() => <GenericInput name="age" type="number" />}
        </FormHarness>
      )

      const input = screen.getByRole("spinbutton") as HTMLInputElement
      fireEvent.change(input, { target: { value: "42" } })

      await waitFor(() => {
        expect(formRef!.getValues("age")).toBe("42")
      })
    })

    it("coerces values to numbers when returnAsNumber is true", async () => {
      let formRef: UseFormReturn<{ age: number | undefined }> | undefined

      render(
        <FormHarness<{ age: number | undefined }>
          defaultValues={{ age: undefined }}
          onFormReady={(f) => (formRef = f)}
        >
          {() => <GenericInput name="age" returnAsNumber />}
        </FormHarness>
      )

      const input = screen.getByRole("textbox") as HTMLInputElement
      fireEvent.change(input, { target: { value: "42" } })

      await waitFor(() => {
        expect(formRef!.getValues("age")).toBe(42)
      })
    })

    it("returns null for empty strings when returnAsNumber is true", async () => {
      let formRef: UseFormReturn<{ age: number | null }> | undefined

      render(
        <FormHarness<{ age: number | null }>
          defaultValues={{ age: 5 }}
          onFormReady={(f) => (formRef = f)}
        >
          {() => <GenericInput name="age" returnAsNumber />}
        </FormHarness>
      )

      const input = screen.getByRole("textbox") as HTMLInputElement
      fireEvent.change(input, { target: { value: "" } })

      await waitFor(() => {
        expect(formRef!.getValues("age")).toBeNull()
      })
    })

    it("returns null for non-numeric input when returnAsNumber is true", async () => {
      let formRef: UseFormReturn<{ age: number | null }> | undefined

      render(
        <FormHarness<{ age: number | null }>
          defaultValues={{ age: null }}
          onFormReady={(f) => (formRef = f)}
        >
          {() => <GenericInput name="age" returnAsNumber />}
        </FormHarness>
      )

      const input = screen.getByRole("textbox") as HTMLInputElement
      fireEvent.change(input, { target: { value: "abc" } })

      await waitFor(() => {
        expect(formRef!.getValues("age")).toBeNull()
      })
    })
  })

  describe("ref forwarding", () => {
    it("merges a forwarded ref with react-hook-form's ref", () => {
      const externalRef = React.createRef<HTMLInputElement>()

      render(<FormHarness>{() => <GenericInput name="email" ref={externalRef} />}</FormHarness>)

      expect(externalRef.current).toBeInstanceOf(HTMLInputElement)
      expect(externalRef.current).toBe(screen.getByRole("textbox"))
    })

    it("supports a callback ref", () => {
      const cb = vi.fn()

      render(<FormHarness>{() => <GenericInput name="email" ref={cb} />}</FormHarness>)

      expect(cb).toHaveBeenCalledWith(expect.any(HTMLInputElement))
    })

    it("allows programmatic focus via a forwarded ref", () => {
      const inputRef = React.createRef<HTMLInputElement>()

      render(<FormHarness>{() => <GenericInput name="email" ref={inputRef} />}</FormHarness>)

      const input = screen.getByRole("textbox")
      expect(document.activeElement).not.toBe(input)

      inputRef.current!.focus()

      expect(document.activeElement).toBe(input)
    })

    it("allows programmatic blur via a callback ref", () => {
      let inputNode: HTMLInputElement | null = null

      render(
        <FormHarness>
          {() => (
            <GenericInput
              name="email"
              ref={(node) => {
                inputNode = node
              }}
            />
          )}
        </FormHarness>
      )

      const input = screen.getByRole("textbox")
      inputNode!.focus()
      expect(document.activeElement).toBe(input)

      inputNode!.blur()
      expect(document.activeElement).not.toBe(input)
    })
  })
})
