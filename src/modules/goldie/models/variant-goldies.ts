import { model } from "@medusajs/framework/utils"

export const VariantGoldies = model.define("variant_goldies", {
  id: model.id().primaryKey(),
  goldies_cost: model.number().default(0),
})

export default VariantGoldies
