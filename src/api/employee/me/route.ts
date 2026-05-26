import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { COMPANY_MODULE } from "../../../modules/company"
import CompanyModuleService from "../../../modules/company/service"
import { UpdateEmployeeBodyType } from "./validators"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const employee = (authReq as any).employee

  const customer = await customerService.retrieveCustomer(employee.customer_id)

  res.json({
    employee: {
      ...employee,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
    }
  })
}

export async function PUT(
  req: MedusaRequest<UpdateEmployeeBodyType>,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const employee = (authReq as any).employee

  const { first_name, last_name, phone} = req.validatedBody

  const updated = await customerService.updateCustomers(
    employee.customer_id,
    {
        first_name,
        last_name,
        phone,
    }
  )

  res.json({ employee: updated })
}