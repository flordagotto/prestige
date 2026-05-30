import { MedusaService } from "@medusajs/framework/utils"
import GoldieTransaction from "./models/goldie-transaction"
import GoldieOrder from "./models/goldie-order"
import VariantGoldies from "./models/variant-goldies"

class GoldieModuleService extends MedusaService({
  GoldieTransaction,
  GoldieOrder,
  VariantGoldies,
}) {}

export default GoldieModuleService