"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { FormProvider, useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { GenericInput } from "@/registry/new-york/ui/generic-input/generic-input"

const schema = z.object({
  email: z.email("Please enter a valid email."),
  password: z.string().min(8, "Must be at least 8 characters."),
})

type FormValues = z.infer<typeof schema>

export default function GenericInputZod() {
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { email: "", password: "" },
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
        <FieldGroup>
          <GenericInput<FormValues> name="email" type="email" required />
          <GenericInput<FormValues> name="password" type="password" required />
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </FieldGroup>
      </form>
    </FormProvider>
  )
}
