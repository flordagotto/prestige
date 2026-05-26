import { z } from "@medusajs/framework/zod"

export const AddProductCategoryBody = z.object({
  name: z.string()
    .max(100),

  description: z.string()
    .max(100),
})

export type AddProductCategoryBodyType =
  z.infer<typeof AddProductCategoryBody>