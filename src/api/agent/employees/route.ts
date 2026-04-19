import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../modules/company"
import CompanyModuleService from "../../../modules/company/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  // TODO: cuando esté el auth, obtener company_id del agent autenticado
  // por ahora lo recibimos como query param para poder probar
  const { company_id } = req.query as { company_id: string }

  if (!company_id) {
    return res.status(400).json({ message: "company_id es requerido" })
  }

  const employees = await companyService.listEmployees({ company_id })

  res.json({ employees })
}