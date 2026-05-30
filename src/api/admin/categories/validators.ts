import { z } from "@medusajs/framework/zod"

export const AddProductCategoryBody = z.object({
  name: z.string().max(100),

  handle: z
    .string()
    .max(100)
    .optional(),

  description: z
    .string()
    .max(255)
    .optional(),
})

export type AddProductCategoryBodyType =
  z.infer<typeof AddProductCategoryBody>
