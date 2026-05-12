import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { GOLDIE_MODULE } from "../../../modules/goldie"
import GoldieModuleService from "../../../modules/goldie/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const authReq = req as AuthenticatedMedusaRequest
  const goldieService: GoldieModuleService = req.scope.resolve(GOLDIE_MODULE)

  const agent = (authReq as any).agent

  const transactions = await goldieService.listGoldieTransactions({
    company_id: agent.company_id,
  })

  res.json({ transactions })
}