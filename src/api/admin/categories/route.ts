import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../modules/company"
import CompanyModuleService from "../../../modules/company/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const categories = await companyService.listCategories()

  res.json({ categories })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const category = await companyService.createCategories(req.body as any)

  res.json({ category })
}