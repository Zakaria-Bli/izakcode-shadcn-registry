"use client"

import { useForm, FormProvider } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { GenericInput } from "@/registry/new-york/ui/generic-input/generic-input"

interface FormValues {
  username: string
  email: string
}

export default function GenericInputDemo() {
  const form = useForm<FormValues>({
    defaultValues: {
      username: "",
      email: "",
    },
  })

  function onSubmit(data: FormValues) {
    // eslint-disable-next-line no-console
    console.log(data)
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto w-full max-w-sm space-y-4">
        <GenericInput<FormValues>
          name="username"
          label="Username"
          description="This is your public display name."
          required
        />
        <GenericInput<FormValues>
          name="email"
          label="Email"
          type="email"
          optionalLabel="Optional"
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </FormProvider>
  )
}
