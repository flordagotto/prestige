import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import CompanyModuleService from "../../../../../modules/company/service"
import { COMPANY_MODULE } from "../../../../../modules/company"

// crea invites de admins a agents
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const userService = req.scope.resolve(Modules.USER)
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const { first_name, last_name, email } = req.body as {
    first_name: string
    last_name: string
    email: string
  }

  // verify company exists and is active
  let company
  try {
    company = await companyService.retrieveCompany(req.params.id)
  } catch {
    return res.status(404).json({ message: "Company not found" })
  }

  if (company.status !== "active") {
    return res.status(400).json({ message: "Cannot invite agent to an inactive company" })
  }

  const expires_at = new Date()
  expires_at.setHours(expires_at.getHours() + 72) // TODO: ver por que se setea +24hs

  const invite = await userService.createInvites([{
    email,
    metadata: {
      company_id: req.params.id,
      role: "agent",
      first_name,
      last_name,
    },
  }])

  res.json({ invite })
}