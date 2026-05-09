"use client"

import { useForm, FormProvider } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { GenericInput } from "@/registry/new-york/ui/generic-input/generic-input"

type ContactFormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export default function GenericInputBasic() {
  const form = useForm<ContactFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  })

  function onSubmit(data: ContactFormValues) {
    // eslint-disable-next-line no-console
    console.log("Form submitted:", data)
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto flex w-full max-w-md flex-col gap-4"
      >
        {/* Auto-generated label from field name ("firstName" → "First Name") */}
        <GenericInput<ContactFormValues> name="firstName" required />

        {/* Explicit label override */}
        <GenericInput<ContactFormValues> name="lastName" label="Family Name" required />

        {/* With description text */}
        <GenericInput<ContactFormValues>
          name="email"
          type="email"
          required
          description="We'll never share your email with anyone else."
        />

        {/* Optional field with opt-in label */}
        <GenericInput<ContactFormValues>
          name="phone"
          type="tel"
          optionalLabel="Optional"
          placeholder="+1 (555) 000-0000"
        />

        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </FormProvider>
  )
}
