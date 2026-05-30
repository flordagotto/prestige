import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { COMPANY_MODULE } from "../../../../../modules/company"
import CompanyModuleService from "../../../../../modules/company/service"

type SetCompanyCategoriesBody = {
  category_ids: string[]
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await companyService.retrieveCompany(req.params.id)

  const { data } = await query.graph({
    entity: "company",
    fields: ["id", "product_categories.id", "product_categories.name", "product_categories.handle"],
    filters: { id: req.params.id },
  })

  res.json({ categories: data[0]?.product_categories ?? [] })
}

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { category_ids } = req.body as SetCompanyCategoriesBody

  if (!Array.isArray(category_ids)) {
    return res.status(400).json({ message: "category_ids must be an array" })
  }

  await companyService.retrieveCompany(req.params.id)

  const { data } = await query.graph({
    entity: "company",
    fields: ["id", "product_categories.id"],
    filters: { id: req.params.id },
  })

  const existingIds: string[] =
    data[0]?.product_categories?.map((category: { id: string }) => category.id) ?? []

  const toRemove = existingIds.filter((id) => !category_ids.includes(id))
  const toAdd = category_ids.filter((id) => !existingIds.includes(id))

  for (const productCategoryId of toRemove) {
    await link.dismiss({
      [Modules.PRODUCT]: {
        product_category_id: productCategoryId,
      },
      [COMPANY_MODULE]: {
        company_id: req.params.id,
      },
    })
  }

  for (const productCategoryId of toAdd) {
    await link.create({
      [Modules.PRODUCT]: {
        product_category_id: productCategoryId,
      },
      [COMPANY_MODULE]: {
        company_id: req.params.id,
      },
    })
  }

  const { data: updated } = await query.graph({
    entity: "company",
    fields: ["id", "product_categories.id", "product_categories.name", "product_categories.handle"],
    filters: { id: req.params.id },
  })

  res.json({ categories: updated[0]?.product_categories ?? [] })
}
