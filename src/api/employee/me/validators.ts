import { z } from "@medusajs/framework/zod"

export const UpdateEmployeeBody = z.object({
   first_name: z
    .string()
    .trim()
    .min(1)
    .max(50),

  last_name: z
    .string()
    .trim()
    .min(1)
    .max(50),

  phone: z
    .string()
    .trim()
    .regex(
        /^\+?[1-9]\d{6,14}$/,
        "Invalid phone number"
    )
})

export type UpdateEmployeeBodyType =
  z.infer<typeof UpdateEmployeeBody>