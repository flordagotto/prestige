import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assignGoldiesToEmployeeWorkflow } from "../../../../../workflows/assign-goldies"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { amount } = req.body as { amount: number }

  // TODO: cuando esté el middleware para auth, obtener company_id del agent autenticado
  // por ahora lo recibimos en el body para poder probar
  const { company_id } = req.body as { company_id: string; amount: number }

  const { result, errors } = await assignGoldiesToEmployeeWorkflow(req.scope).run({
    input: {
      company_id,
      employee_id: req.params.id,
      amount,
    //   performed_by: req.auth_context.actor_id, // TODO: va a funcionar cuando tengamos el middleware de auth planteado x wsp
      performed_by: "temp_agent",
    },
    throwOnError: false,
  })

  if (errors.length > 0) {
    return res.status(400).json({
      message: errors[0].error.message,
    })
  }

  res.json(result)
}