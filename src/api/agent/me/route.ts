import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { UpdateAgentBodyType } from "./validators"

function buildAgentProfile(agent: Record<string, unknown>, customer: Record<string, any>) {
  return {
    ...agent,
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email,
    phone: customer.phone,
  }
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const agent = (authReq as any).agent

  const customer = await customerService.retrieveCustomer(agent.customer_id)

  res.json({
    agent: buildAgentProfile(agent, customer),
  })
}

export async function PUT(
  req: MedusaRequest<UpdateAgentBodyType>,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const agent = (authReq as any).agent

  const { first_name, last_name, phone } = req.validatedBody

  const updated = await customerService.updateCustomers(
    agent.customer_id,
    {
      first_name,
      last_name,
      phone,
    }
  )

  res.json({
    agent: buildAgentProfile(agent, updated),
  })
}
