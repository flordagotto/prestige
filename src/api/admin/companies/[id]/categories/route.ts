import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../../../modules/company"
import CompanyModuleService from "../../../../../modules/company/service"

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const { category_ids } = req.body as { category_ids: string[] }

  // eliminar categorías existentes de la empresa
  const existing = await companyService.listCategoryXCompanies({
    company_id: req.params.id,
  })
  if (existing.length > 0) {
    await companyService.deleteCategoryXCompanies(
      existing.map((c) => c.id)
    )
  }

  // crear las nuevas
  const categories = await Promise.all(
    category_ids.map((category_id) =>
      companyService.createCategoryXCompanies({
        company_id: req.params.id,
        category_id,
      })
    )
  )
  // ver si conviene pisarlas asi o hacer dos endpoints para agregar y quitar 
  res.json({ categories })
}