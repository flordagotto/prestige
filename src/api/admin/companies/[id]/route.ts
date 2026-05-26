import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../../modules/company"
import CompanyModuleService from "../../../../modules/company/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const company = await companyService.retrieveCompany(req.params.id)

  res.json({ company })
}

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const activate = req.body as { active: boolean | null }

  if(activate == null)
    return;

  const company = await companyService.updateCompanies({
    id: req.params.id,
    status: activate ? "active" : "inactive"
  })

  res.json({ company })
}