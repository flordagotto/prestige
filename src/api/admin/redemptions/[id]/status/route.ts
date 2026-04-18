import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GOLDIE_MODULE } from "../../../../../modules/goldie"
import GoldieModuleService from "../../../../../modules/goldie/service"

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const goldieService: GoldieModuleService = req.scope.resolve(GOLDIE_MODULE)

  const { status } = req.body as {
    status: "pending" | "processing" | "completed" | "cancelled"
  }

  const redemption = await goldieService.updateRedemptionRequests({
    id: req.params.id,
    status,
  })

  res.json({ redemption })
}