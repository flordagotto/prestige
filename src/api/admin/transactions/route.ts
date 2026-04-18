import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GOLDIE_MODULE } from "../../../modules/goldie"
import GoldieModuleService from "../../../modules/goldie/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const goldieService: GoldieModuleService = req.scope.resolve(GOLDIE_MODULE)

  const transactions = await goldieService.listGoldieTransactions()

  res.json({ transactions })
}