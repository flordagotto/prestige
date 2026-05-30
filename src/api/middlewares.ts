import { 
  defineMiddlewares,
  authenticate,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../modules/company"
import CompanyModuleService from "../modules/company/service"
import { UpdateEmployeeBody as PatchAgentEmployeeBody } from "./agent/employees/[id]/validators"
import { UpdateCompanyBody } from "./admin/companies/[id]/validators"
import { AddProductCategoryBody } from "./admin/categories/validators"
import { ZodObject, ZodEffects, ZodTypeAny, ZodTypeDef } from "zod"
import { InviteAgentBody } from "./admin/companies/[id]/agents/validators"
import { InviteEmployeeBody } from "./agent/employees/validators"
import { ChangePasswordBody } from "./employee/me/password/validators"
import { UpdateEmployeeBody as UpdateEmployeeMeBody } from "./employee/me/validators"
import { UpdateAgentBody } from "./agent/me/validators"

type ValidBodySchema =
  | ZodObject<any, any, ZodTypeAny>
  | ZodEffects<any, any, any>

const requireAgent = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const authReq = req as AuthenticatedMedusaRequest

  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const agents = await companyService.listAgents({
    customer_id: authReq.auth_context.actor_id,
  })

  if (!agents.length) {
    return res.status(403).json({ message: "Forbidden: not an agent" })
  }

  if (agents[0].status !== "active") {
    return res.status(403).json({ message: "Forbidden: agent is inactive" })
  }

  // inyectamos el agent en el request para usarlo en las rutas sin hacer otra query a la DB
  (authReq as any).agent = agents[0]

  next()
}

const requireEmployee = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const authReq = req as AuthenticatedMedusaRequest

  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const employees = await companyService.listEmployees({
    customer_id: authReq.auth_context.actor_id,
  })

  if (!employees.length) {
    return res.status(403).json({ message: "Forbidden: not an employee" })
  }

  if (employees[0].status !== "active") {
    return res.status(403).json({ message: "Forbidden: employee is inactive" })
  }

  (authReq as any).employee = employees[0]

  next()
}

const agentMiddlewares = [
  authenticate("customer", ["session", "bearer"]),
  requireAgent,
]

const employeeMiddlewares = [
  authenticate("customer", ["session", "bearer"]),
  requireEmployee,
]

const adminMiddlewares = [
  authenticate("user", ["session", "bearer"])
]

const withBodyValidation = (base: any[], schema: ValidBodySchema) => [
  ...base,
  validateAndTransformBody(schema),
]

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: adminMiddlewares,
    },
    {
      matcher: "/agent/*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: agentMiddlewares,
    },
    {
      matcher: "/employee/*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: employeeMiddlewares,
    },
    {
      matcher: "/admin/categories",
      method: "POST",
      middlewares: withBodyValidation(adminMiddlewares, AddProductCategoryBody)
    },
    {
      matcher: "/admin/companies/:id",
      method: "PATCH",
      middlewares: withBodyValidation(adminMiddlewares, UpdateCompanyBody)
    },
    {
      matcher: "/admin/companies/:id/agents",
      method: "POST",
      middlewares: withBodyValidation(adminMiddlewares, InviteAgentBody)
    },
    {
      matcher: "/agent/employees/:id",
      method: "PATCH",
      middlewares: withBodyValidation(agentMiddlewares, PatchAgentEmployeeBody)
    },
    {
      matcher: "/agent/employees",
      method: "POST",
      middlewares: withBodyValidation(agentMiddlewares, InviteEmployeeBody)
    },
    {
      matcher: "/employee/me/password",
      method: "PUT",
      middlewares: withBodyValidation(employeeMiddlewares, ChangePasswordBody)
    },
    {
      matcher: "/employee/me",
      method: "PUT",
      middlewares: withBodyValidation(employeeMiddlewares, UpdateEmployeeMeBody)
    },
    {
      matcher: "/agent/me",
      method: "PUT",
      middlewares: withBodyValidation(agentMiddlewares, UpdateAgentBody)
    },
    {
      matcher: "/agent/me/password",
      method: "PUT",
      middlewares: withBodyValidation(agentMiddlewares, ChangePasswordBody)
    },
  ],
})

