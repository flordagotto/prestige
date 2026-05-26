import { z } from "@medusajs/framework/zod"

export const InviteAgentBody = z.object({
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
})

export type InviteAgentBodyType =
  z.infer<typeof InviteAgentBody>