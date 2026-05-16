import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { validatePasswordComplexity } from "../../../../utils/password"

// TODO: pensar seguridad

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const logger = req.scope.resolve("logger")
  const authReq = req as AuthenticatedMedusaRequest
  const authService = req.scope.resolve(Modules.AUTH)

  const { current_password, new_password } = req.body as {
    current_password: string
    new_password: string
  }

  const passwordError = validatePasswordComplexity(new_password)
  
  if (passwordError) {
    return res.status(400).json({ message: passwordError })
  }

  logger.debug("New password validated");

  const { success: currentPasswordValid } = await authService.authenticate(
    "emailpass",
    {
      url: req.url,
      headers: req.headers as unknown as Record<string, string>,
      query: req.query as unknown as Record<string, string>,
      body: {
        email: authReq.auth_context.actor_id,
        password: current_password,
      },
      protocol: req.protocol,
    }
  )

  if (!currentPasswordValid) {
    return res.status(400).json({ message: "Current password is incorrect" })
  }

  const { success, error } = await authService.updateProvider(
    "emailpass",
    {
      entity_id: authReq.auth_context.actor_id,
      password: new_password,
    }
  )

  if (!success) {
    return res.status(400).json({ message: error || "Failed to update password" })
  }

  res.json({ success: true })
}