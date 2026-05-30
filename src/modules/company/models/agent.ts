import { model } from "@medusajs/framework/utils"
import Company from "./company"

const Agent = model.define("agent", {
  id:          model.id().primaryKey(),
  customer_id: model.text(),
  status:      model.enum(["active", "inactive"]).default("active"),
  company:     model.belongsTo(() => Company, { mappedBy: "agents" }),
})

export default Agent