import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../../modules/company"
import CompanyModuleService from "../../../../modules/company/service"
import { UpdateCompanyBodyType } from "./validators"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const company = await companyService.retrieveCompany(req.params.id)

  res.json({ company })
}

export async function PATCH(
  req: MedusaRequest<UpdateCompanyBodyType>,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const { active } = req.validatedBody

  const company = await companyService.updateCompanies({
    id: req.params.id,
    status: active ? "active" : "inactive"
  })

  res.json({ company })
}