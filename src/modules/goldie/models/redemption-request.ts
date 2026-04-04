import { model } from "@medusajs/framework/utils"

const RedemptionRequest = model.define("redemption_request", {
  id:                   model.id().primaryKey(),
  employee_id:          model.text(),
  product_id:           model.text(),
  goldies_cost:         model.number(),
  payment_intent_id:    model.text().nullable(),
  payment_status:       model.enum(["pending", "paid", "failed"]).default("pending"),
  status:               model.enum([
                          "pending",
                          "processing",
                          "completed",
                          "cancelled"
                        ]).default("pending"),
  delivery_full_name:   model.text(),
  delivery_street:      model.text(),
  delivery_city:        model.text(),
  delivery_state:       model.text().nullable(),
  delivery_postal_code: model.text(),
  delivery_country:     model.text(),
  delivery_phone:       model.text().nullable(),
  delivery_notes:       model.text().nullable(),
})

export default RedemptionRequest