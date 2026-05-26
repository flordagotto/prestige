import { z } from "@medusajs/framework/zod"

export const InviteEmployeeBody = z.object({
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

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format")
    .max(254),

  role: z
    .string()
    .trim()
    .min(1)
    .max(50),

  department: z
    .string()
    .trim()
    .min(1)
    .max(50),
})

export type InviteEmployeeBodyType =
  z.infer<typeof InviteEmployeeBody>