import { z } from "@medusajs/framework/zod"
import { validatePasswordComplexity } from "../../../../utils/password"

export const ChangePasswordBody = z.object({
  new_password: z.string().superRefine(
    (password, ctx) => {
        const error =
        validatePasswordComplexity(password)

        if (error) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: error,
        })
        }
    }),
})

export type ChangePasswordBodyType =
  z.infer<typeof ChangePasswordBody>