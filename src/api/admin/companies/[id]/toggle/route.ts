import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../../../modules/company"
import CompanyModuleService from "../../../../../modules/company/service"

// activate or deactivate company
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const company = await companyService.retrieveCompany(req.params.id)

  const updated = await companyService.updateCompanies({
    id: req.params.id,
    status: company.status === "active" ? "inactive" : "active",
  })

  res.json({ company: updated })
}