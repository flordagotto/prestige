import { model } from "@medusajs/framework/utils"

const GoldieTransaction = model.define("goldie_transaction", {
  id:           model.id().primaryKey(),
  type:         model.enum([
                  "company_assignment",
                  "employee_assignment",
                  "redemption",
                  "adjustment"
                ]),
  company_id:   model.text(),
  employee_id:  model.text().nullable(),
  product_id:   model.text().nullable(),
  amount:       model.number(),
  performed_by: model.text(),
  note:         model.text().nullable(),
})

export default GoldieTransaction