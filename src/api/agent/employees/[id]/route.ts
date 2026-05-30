import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../../modules/company"
import CompanyModuleService from "../../../../modules/company/service"
import { Modules } from "@medusajs/framework/utils"
import { UpdateEmployeeBodyType } from "./validators"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const agent = (authReq as any).agent

  const employee = await companyService.retrieveEmployee(req.params.id)

  // verify the employee belongs to the agent's company
  if (employee.company_id !== agent.company_id) {
    return res.status(403).json({ message: "Forbidden: employee does not belong to your company" })
  }
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

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const agent = (authReq as any).agent

  const employee = await companyService.retrieveEmployee(req.params.id)

  if (!employee) {
    return res.status(404).json(
      { message: "Not found: employee does not exist" }
    )
  }

  if (employee.company_id !== agent.company_id) {
    return res.status(403).json(
      { message: "Forbidden: employee does not belong to your company" }
    )
  }

  await companyService.deleteEmployees(req.params.id)

  res.json({ success: true, id: req.params.id })
}

export async function PATCH(
  req: MedusaRequest<UpdateEmployeeBodyType>,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const agent = (authReq as any).agent

  const employee = await companyService.retrieveEmployee(req.params.id)

  if (employee.company_id !== agent.company_id) {
    return res.status(403).json({ message: "Forbidden: employee does not belong to your company" })
  }

  const { active, role, department } = req.validatedBody

  const updateData: any = {
    id: req.params.id,
  }

  if (active !== undefined) {
    updateData.status = active ? "active" : "inactive"
  }

  if (role !== undefined) {
    updateData.role = role
  }

  if (department !== undefined) {
    updateData.department = department
  }

  const updated = await companyService.updateEmployees(updateData)

  res.json({
    employee: updated,
  })
}