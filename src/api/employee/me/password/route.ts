import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { validatePasswordComplexity } from "../../../../utils/password"

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const authService = req.scope.resolve(Modules.AUTH)
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const logger = req.scope.resolve("logger")

  const employee = (authReq as any).employee

  const { new_password } = req.body as {
    new_password: string
  }

  const passwordError = validatePasswordComplexity(new_password)
  if (passwordError) {
    return res.status(400).json({ message: passwordError })
  }

  const customer = await customerService.retrieveCustomer(employee.customer_id)

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