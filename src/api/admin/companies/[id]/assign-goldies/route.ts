import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assignGoldiesToCompanyWorkflow } from "../../../../../workflows/assign-goldies"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { amount, note } = req.body as { amount: number; note?: string }

  const { result, errors } = await assignGoldiesToCompanyWorkflow(req.scope).run({
    input: {
      company_id: req.params.id,
      amount,
      performed_by: "temp_admin",
    //   performed_by: req.auth_context.actor_id, // TODO: va a funcionar cuando tengamos el middleware de auth planteado x wsp
      note,
    },
    throwOnError: false,
  })

   if (errors.length > 0) {
    return res.status(400).json({ 
      message: errors[0].error.message 
    })
  }

  res.json(result)
}