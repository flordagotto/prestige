import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { upsertVariantGoldiesWorkflow } from "../../../../../workflows/upsert-variant-goldies"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve("query")

  const { data: [variant] } = await query.graph({
    entity: "product_variant",
    fields: ["variant_goldies.*"],
    filters: { id }
  })

  res.json({
    goldies_cost: variant?.variant_goldies?.goldies_cost || 0
  })
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { goldies_cost } = req.body as { goldies_cost: number }

  const { result } = await upsertVariantGoldiesWorkflow(req.scope).run({
    input: {
      variant_id: id,
      goldies_cost
    }
  })

  res.json({
    result
  })
}
