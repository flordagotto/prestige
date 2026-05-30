import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import ProductCategoryCompanyLink from "../links/product-category-company"

export type ProductCategorySummary = {
  id: string
  name: string
  handle: string
}

type LinkRow = {
  product_category_id: string
  product_category?: ProductCategorySummary | null
}

export async function listCompanyProductCategories(
  container: MedusaContainer,
  companyId: string
): Promise<ProductCategorySummary[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: ProductCategoryCompanyLink.entryPoint,
    fields: [
      "product_category_id",
      "product_category.id",
      "product_category.name",
      "product_category.handle",
    ],
    filters: {
      company_id: companyId,
    },
  })

  return ((data ?? []) as LinkRow[])
    .map((row) => row.product_category)
    .filter((category): category is ProductCategorySummary => Boolean(category))
}

export async function listCompanyProductCategoryIds(
  container: MedusaContainer,
  companyId: string
): Promise<string[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: ProductCategoryCompanyLink.entryPoint,
    fields: ["product_category_id"],
    filters: {
      company_id: companyId,
    },
  })

  return ((data ?? []) as LinkRow[]).map((row) => row.product_category_id)
}
