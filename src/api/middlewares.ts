import { 
  defineMiddlewares,
  authenticate,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../modules/company"
import CompanyModuleService from "../modules/company/service"

const requireAgent = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const authReq = req as AuthenticatedMedusaRequest

  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const agents = await companyService.listAgents({
    user_id: authReq.auth_context.actor_id,
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
    user_id: authReq.auth_context.actor_id,
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

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/*",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/agent/*",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        requireAgent,
      ],
    },
    {
      matcher: "/employee/*",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        requireEmployee,
      ],
    },
  ],
})