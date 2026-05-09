"use client"

import { FormProvider, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { GenericInput } from "@/registry/new-york/ui/generic-input/generic-input"

export default function GenericInputPassword() {
  type FormValues = {
    password: string
  }

  const form = useForm<FormValues>({
    defaultValues: { password: "" },
  })

  function onSubmit(data: FormValues) {
    // eslint-disable-next-line no-console
    console.log(data)
  }

  return (
    <FormProvider {...form}>
      <form
        className="mx-auto flex w-full max-w-md flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
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

        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
    </FormProvider>
  )
}
