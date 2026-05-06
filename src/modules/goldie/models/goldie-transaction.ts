import { model } from "@medusajs/framework/utils"

const GoldieTransaction = model.define("goldie_transaction", {
  id:             model.id().primaryKey(),
  /**
   * type:
   * - earned: Goldies earned by an employee (e.g., as a reward).
   * - spent: Goldies spent by an employee (e.g., placing an order).
   * - topup: Goldies added to a company's balance (e.g., purchased by the company).
   * - adjustment: Manual modifications to balances (e.g., admin corrections or initial assignments).
   */
  type:           model.enum(["earned", "spent", "topup", "adjustment"]),
  company_id:     model.text(),
  employee_id:    model.text().nullable(),
  amount:         model.number(),
  reference_type: model.text(),
  reference_id:   model.text(),
  performed_by:   model.text(),
  order:          model.hasOne(() => {
                    const GoldieOrder = require("./goldie-order").default
                    return GoldieOrder
                  }, { mappedBy: "transaction" }).nullable(),
})

export default GoldieTransaction