import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  await deleteProductCategoriesWorkflow(req.scope).run({
    input: [req.params.id],
  })

  res.json({ success: true, id: req.params.id })
}
