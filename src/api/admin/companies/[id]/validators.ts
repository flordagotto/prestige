import { z } from "@medusajs/framework/zod"

export const UpdateCompanyBody = z.object({
  active: z.boolean(),
})

export type UpdateCompanyBodyType =
  z.infer<typeof UpdateCompanyBody>