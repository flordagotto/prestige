import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createInvitesWorkflow } from "@medusajs/medusa/core-flows"
import CompanyModuleService from "../../../../../modules/company/service"
import { COMPANY_MODULE } from "../../../../../modules/company"
import { InviteAgentBodyType } from "./validators"

// crea invites de admins a agents
export async function POST(
  req: MedusaRequest<InviteAgentBodyType>,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const { first_name, last_name, email } = req.validatedBody

  let company
  try {
    company = await companyService.retrieveCompany(req.params.id)
  } catch {
    return res.status(404).json({ message: "Company not found" })
  }

  if (company.status !== "active") {
    return res.status(400).json({ message: "Cannot invite agent to an inactive company" })
  }

  const { result, errors } = await createInvitesWorkflow(req.scope).run({
    input: {
      invites: [{
        email,
        metadata: {
          company_id: req.params.id,
          role: "agent",
          first_name,
          last_name,
        },
      }],
    },
    throwOnError: false,
  })

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0].error.message })
  }

  res.json({ invite: result[0] })
}