import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { UpdateMyEmployeeProfileBodyType } from "./validators"

function buildEmployeeProfile(employee: Record<string, unknown>, customer: Record<string, any>) {
  return {
    ...employee,
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

  const employee = (authReq as any).employee

  const customer = await customerService.retrieveCustomer(employee.customer_id)

  res.json({
    employee: buildEmployeeProfile(employee, customer),
  })
}

export async function PUT(
  req: MedusaRequest<UpdateMyEmployeeProfileBodyType>,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const employee = (authReq as any).employee

  const { first_name, last_name, phone } = req.validatedBody

  const updated = await customerService.updateCustomers(
    employee.customer_id,
    {
      first_name,
      last_name,
      phone,
    }
  )

  res.json({
    employee: buildEmployeeProfile(employee, updated),
  })
}
