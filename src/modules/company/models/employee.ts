import { model } from "@medusajs/framework/utils"
import Company from "./company"

const Employee = model.define("employee", {
  id:             model.id().primaryKey(),
  user_id:        model.text(),
  goldie_balance: model.number().default(0),
  status:         model.enum(["active", "inactive"]).default("active"),
  company:        model.belongsTo(() => Company, { mappedBy: "employees" }),
})

export default Employee