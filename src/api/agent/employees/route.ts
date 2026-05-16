import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../modules/company"
import CompanyModuleService from "../../../modules/company/service"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const userService = req.scope.resolve(Modules.USER)
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const { first_name, last_name, email } = req.body as {
    first_name: string
    last_name: string
    email: string
  }

  // obtener el agent autenticado (inyectado por el middleware)
  const agent = (authReq as any).agent

  // verify company is still active
  const company = await companyService.retrieveCompany(agent.company_id)

  if (company.status !== "active") {
    return res.status(400).json({ message: "Cannot invite employee to an inactive company" })
  }

  const invite = await userService.createInvites({
    email,
    metadata: {
      company_id: agent.company_id,
      role: "employee",
      first_name,
      last_name,
    },
  })

  res.json({ invite })
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
      }
    })
  )

  res.json({ employees: employeesWithProfile })   
}