import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"
import { AddProductCategoryBodyType } from "./validators"

function toHandle(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "description", "is_active", "is_internal"],
  })

  res.json({ categories })
}

export async function POST(
  req: MedusaRequest<AddProductCategoryBodyType>,
  res: MedusaResponse
) {
  const { name, handle, description } = req.validatedBody

  const { result } = await createProductCategoriesWorkflow(req.scope).run({
    input: {
      product_categories: [
        {
          name,
          handle: handle ?? toHandle(name),
          description,
          is_active: true,
        },
      ],
    },
  })

  res.json({ category: result[0] })
}
