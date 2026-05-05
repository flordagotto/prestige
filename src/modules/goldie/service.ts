import { MedusaService } from "@medusajs/framework/utils"
import GoldieTransaction from "./models/goldie-transaction"
import GoldieOrder from "./models/goldie-order"

class GoldieModuleService extends MedusaService({
  GoldieTransaction,
  GoldieOrder,
}) {}

export default GoldieModuleService