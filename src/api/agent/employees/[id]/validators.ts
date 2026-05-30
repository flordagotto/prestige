import { z } from "@medusajs/framework/zod"

export const UpdateEmployeeBody = z.object({
  active: z.boolean().optional(),

  role: z
    .string()
    .max(100)
    .optional(),

  department: z
    .string()
    .max(100)
    .optional(),
})
  .refine(
    (data) =>
      data.active !== undefined ||
      data.role !== undefined ||
      data.department !== undefined,
    {
      message: "At least one field must be provided",
    }
  )

  export type UpdateEmployeeBodyType =
  z.infer<typeof UpdateEmployeeBody>