import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../modules/company"
import CompanyModuleService from "../../../modules/company/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const companies = await companyService.listCompanies()

  res.json({ companies })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const company = await companyService.createCompanies(req.body as any)

  res.json({ company })
}