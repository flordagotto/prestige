import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { acceptInviteWorkflow } from "../../../workflows/accept-invite"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { token, password } = req.body as {
    token: string
    password: string
  }

  const { result, errors } = await acceptInviteWorkflow(req.scope).run({
    input: {
      token,
      password,
      url: req.url,
      headers: req.headers as Record<string, unknown>,
      query: req.query as Record<string, unknown>,
      protocol: req.protocol,
    },
    throwOnError: false,
  })

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0].error.message })
  }

  res.json(result)
}