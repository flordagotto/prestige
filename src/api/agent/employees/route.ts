import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { createInvitesWorkflow } from "@medusajs/medusa/core-flows"
import CompanyModuleService from "../../../modules/company/service"
import { COMPANY_MODULE } from "../../../modules/company"
import { InviteEmployeeBodyType } from "./validators"

export async function POST(
  req: MedusaRequest<InviteEmployeeBodyType>,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const { first_name, last_name, email, role, department } = req.validatedBody

  const agent = (authReq as any).agent

  const company = await companyService.retrieveCompany(agent.company_id)

  if (company.status !== "active") {
    return res.status(400).json({ message: "Cannot invite employee to an inactive company" })
  }

  const { result, errors } = await createInvitesWorkflow(req.scope).run({
    input: {
      invites: [{
        email,
        metadata: {
          company_id: agent.company_id,
          role: "employee",
          first_name,
          last_name,
          employee_role: role,
          employee_department: department,
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

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const agent = (authReq as any).agent

  const employees = await companyService.listEmployees({
    company_id: agent.company_id,
  })

  const employeesWithProfile = await Promise.all(
    employees.map(async (employee) => {
      const customer = await customerService.retrieveCustomer(employee.customer_id)
      return {
        ...employee,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
      }
    })
  )

  res.json({ employees: employeesWithProfile })   
}