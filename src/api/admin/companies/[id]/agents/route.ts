// import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// import { COMPANY_MODULE } from "../../../../../modules/company"
// import CompanyModuleService from "../../../../../modules/company/service"
// import { Modules } from "@medusajs/framework/utils"
// import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"

// export async function POST(
//   req: MedusaRequest,
//   res: MedusaResponse
// ) {
//   const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)
//   const authService = req.scope.resolve(Modules.AUTH)
//   const customerService = req.scope.resolve(Modules.CUSTOMER)

//   const { first_name, last_name, email, password } = req.body as {
//     first_name: string
//     last_name: string
//     email: string
//     password: string
//   }

//   // 1. crear customer con credenciales usando el workflow oficial de Medusa
//     const { result: customer } = await createCustomerAccountWorkflow(req.scope).run({
//     input: {
//       customerData: { first_name, last_name, email },
//       authIdentityId: undefined, // se crea una nueva identidad
//     },
//   })

//   // 2. crear el agent vinculado a la empresa
//   const agent = await companyService.createAgents({
//     user_id: customer.id,
//     company_id: req.params.id,
//   })

//   res.json({ agent })
// }