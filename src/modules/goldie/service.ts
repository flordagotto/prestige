import { MedusaService } from "@medusajs/framework/utils"
import GoldieTransaction from "./models/goldie-transaction"
import RedemptionRequest from "./models/redemption-request"

class GoldieModuleService extends MedusaService({
  GoldieTransaction,
  RedemptionRequest,
}) {}

export default GoldieModuleService