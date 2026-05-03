import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPANY_MODULE } from "../../../modules/company"
import CompanyModuleService from "../../../modules/company/service"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const userService = req.scope.resolve(Modules.USER)
  const authService = req.scope.resolve(Modules.AUTH)
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const { token, password } = req.body as {
    token: string
    password: string
  }

  // 1. validar el token
  let invite
  try {
    invite = await userService.validateInviteToken(token)
  } catch {
    return res.status(400).json({ message: "Invalid or expired token" })
  }

  if (invite.accepted) {
    return res.status(400).json({ message: "This invitation has already been accepted" })
  }

  const { company_id, role, first_name, last_name } = invite.metadata as {
    company_id: string
    role: "agent" | "employee"
    first_name: string
    last_name: string
  }

  // 2. registrar auth identity con email + password
  const { success, authIdentity, error } = await authService.register(
    "emailpass",
    {
      url: req.url,
      headers: req.headers as unknown as Record<string, string>,
      query: req.query as unknown as Record<string, string>,
      body: { email: invite.email, password },
      protocol: req.protocol,
    }
  )

  if (!success || !authIdentity) {
    return res.status(400).json({ message: error || "Error creating credentials" })
  }

  // 3. crear customer
  const customer = await customerService.createCustomers({
    first_name,
    last_name,
    email: invite.email,
  })

  // 4. vincular customer a auth identity
  await authService.updateAuthIdentities({
    id: authIdentity.id,
    app_metadata: { 
        customer_id: customer.id,
        role: role
    },
  })

  // 5. crear agent o employee según el rol
  if (role === "agent") {
    await companyService.createAgents({
      user_id: customer.id,
      company_id,
    })
  } else {
    await companyService.createEmployees({
      user_id: customer.id,
      company_id,
    })
  }

  // 6. marcar invite como aceptada
  await userService.updateInvites({
    id: invite.id,
    accepted: true,
  })

  res.json({ success: true })
}