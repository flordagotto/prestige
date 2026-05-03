import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const userService = req.scope.resolve(Modules.USER)

  const { first_name, last_name, email } = req.body as {
    first_name: string
    last_name: string
    email: string
  }

  const expires_at = new Date()
  expires_at.setHours(expires_at.getHours() + 72)

  const invite = await userService.createInvites([{
    email,
    metadata: {
      company_id: req.params.id,
      role: "agent",
      first_name,
      last_name,
    },
  }])

  res.json({ invite })
}