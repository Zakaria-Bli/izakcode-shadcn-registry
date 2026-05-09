"use client"

import { FormProvider, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { GenericInput } from "@/registry/new-york/ui/generic-input/generic-input"

type FormValues = {
  age: number | null
}

export default function GenericInputNumeric() {
  const form = useForm<FormValues>({
    defaultValues: { age: null },
  })

  function onSubmit(data: FormValues) {
    // eslint-disable-next-line no-console
    console.log(data)
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto flex w-full max-w-md flex-col gap-4"
      >
        <GenericInput<FormValues>
          name="age"
          type="number"
          label="Age"
          placeholder="42"
          step="1"
          min={0}
          returnAsNumber
          description="With returnAsNumber enabled, empty and invalid values resolve to null instead of an empty string."
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </FormProvider>
  )
}
