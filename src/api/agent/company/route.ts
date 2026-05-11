import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../modules/company"
import CompanyModuleService from "../../../modules/company/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const agent = (authReq as any).agent

  const company = await companyService.retrieveCompany(agent.company_id, {
    relations: ["categories"],
  })

  res.json({ company })
}

// obtiene los datos de la compañía del agente logueado únicamente, para no exponer datos de otras compañías