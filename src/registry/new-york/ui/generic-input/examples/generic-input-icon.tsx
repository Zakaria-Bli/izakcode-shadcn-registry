"use client"

import { Mail } from "lucide-react"
import { useForm, FormProvider } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { GenericInput } from "@/registry/new-york/ui/generic-input/generic-input"

type FormValues = {
  email: string
}

export default function GenericInputIcon() {
  const form = useForm<FormValues>({
    defaultValues: {
      email: "",
    },
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
          name="email"
          type="email"
          icon={<Mail className="size-4" />}
          required
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </FormProvider>
  )
}
