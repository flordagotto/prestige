import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const userService = req.scope.resolve(Modules.USER)

  const { first_name, last_name, email } = req.body as {
    first_name: string
    last_name: string
    email: string
  }

  // obtener el agent autenticado (inyectado por el middleware)
  const agent = (authReq as any).agent

  const invite = await userService.createInvites({
    email,
    metadata: {
      company_id: agent.company_id,
      role: "employee",
      first_name,
      last_name,
    },
  })

  res.json({ invite })
}