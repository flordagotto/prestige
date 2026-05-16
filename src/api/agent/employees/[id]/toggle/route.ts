import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../../../modules/company"
import CompanyModuleService from "../../../../../modules/company/service"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const agent = (authReq as any).agent

  const employee = await companyService.retrieveEmployee(req.params.id)

  if (employee.company_id !== agent.company_id) {
    return res.status(403).json({ message: "Forbidden: employee does not belong to your company" })
  }

  const updated = await companyService.updateEmployees({
    id: req.params.id,
    status: employee.status === "active" ? "inactive" : "active",
  })

  res.json({ employee: updated })
}