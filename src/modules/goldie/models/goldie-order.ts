import { model } from "@medusajs/framework/utils"
import GoldieTransaction from "./goldie-transaction"

const GoldieOrder = model.define("goldie_order", {
  id:                model.id().primaryKey(),
  medusa_order_id:   model.text(),
  employee_id:       model.text(),
  transaction:       model.belongsTo(() => GoldieTransaction, { mappedBy: "order" }),
  total_points_cost: model.number(),
})

export default GoldieOrder
