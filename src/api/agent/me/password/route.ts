import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ChangePasswordBodyType } from "../../../employee/me/password/validators"

export async function PUT(
  req: MedusaRequest<ChangePasswordBodyType>,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const authService = req.scope.resolve(Modules.AUTH)
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const logger = req.scope.resolve("logger")

  const agent = (authReq as any).agent

  const { new_password } = req.validatedBody

  const customer = await customerService.retrieveCustomer(agent.customer_id)

  const { success, error } = await authService.updateProvider(
    "emailpass",
    {
      entity_id: customer.email,
      password: new_password,
    }
  )

  if (!success) {
    return res.status(400).json({ message: error || "Failed to update password" })
  }

  logger.info(`Password updated for: ${customer.email}`)
  res.json({ success: true })
}
