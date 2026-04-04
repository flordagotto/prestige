import { model } from "@medusajs/framework/utils"

const Company = model.define("company", {
  id:             model.id().primaryKey(),
  name:           model.text(),
  tax_id:         model.text(),
  contact_email:  model.text(),
  status:         model.enum(["active", "inactive"]).default("inactive"),
  goldie_balance: model.number().default(0),
  categories: model.hasMany(() => {
    const CategoryXCompany = require("./category-x-company").default
    return CategoryXCompany
  }, { mappedBy: "company" }),
  agents: model.hasMany(() => {
    const Agent = require("./agent").default
    return Agent
  }, { mappedBy: "company" }),
  employees: model.hasMany(() => {
    const Employee = require("./employee").default
    return Employee
  }, { mappedBy: "company" }),
})

export default Company