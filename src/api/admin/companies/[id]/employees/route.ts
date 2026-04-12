import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../../../modules/company"
import CompanyModuleService from "../../../../../modules/company/service"
import { Modules } from "@medusajs/framework/utils"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)
  const userService = req.scope.resolve(Modules.USER)

  const { first_name, last_name, email } = req.body as {
    first_name: string
    last_name: string
    email: string
  }

  const user = await userService.createUsers({
    first_name,
    last_name,
    email,
  })

  const employee = await companyService.createEmployees({
    user_id: user.id,
    company_id: req.params.id,
  })
  // ver que otros datos vamos a pedir: identificacion, fecha de nacimiento, algo?
  res.json({ employee })
}