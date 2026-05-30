import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { spendGoldiesWorkflow } from "../workflows/spend-goldies";

/**
 * SUBSCRIBER: goldie-order-placed
 * Event: order.placed
 * 
 * This subscriber listens for successful order placement, calculates the total
 * Goldie cost based on the variants in the order, and triggers the spend-goldies
 * workflow to debit the employee's balance.
 */
export default async function goldieOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const { id: orderId } = data;
  const query = container.resolve("query");

  // 1. Fetch order with items and customer_id
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "items.variant_id", "items.quantity"],
    filters: { id: orderId }
  });

  // Only proceed if we have a customer linked to the order
  if (!order || !order.customer_id) {
    return;
  }

  // 2. Resolve the Employee and their Company
  const { data: [employee] } = await query.graph({
    entity: "employee",
    fields: ["id", "company.id"],
    filters: { customer_id: order.customer_id }
  });

  if (!employee || !employee.company?.id) {
    // This should not happen for redemption orders as per validation rules
    return;
  }

  // 3. Calculate the total Goldie cost by summing up variant_goldies.goldies_cost
  let totalGoldiesCost = 0;
  const orderItems = order.items || [];
  for (const item of orderItems) {
    if (!item || !item.variant_id) {
      continue;
    }
    const { data: [variant] } = await query.graph({
      entity: "product_variant",
      fields: ["variant_goldies.goldies_cost"],
      filters: { id: item.variant_id }
    });

    const goldiesCost = variant?.variant_goldies?.goldies_cost || 0;
    totalGoldiesCost += goldiesCost * (item.quantity || 0);
  }

  // If the order has no Goldie cost, we don't need to debit anything
  if (totalGoldiesCost <= 0) {
    return;
  }

  // 4. Execute the spend-goldies workflow to debit balance and register transaction
  try {
    await spendGoldiesWorkflow(container).run({
      input: {
        employee_id: employee.id,
        company_id: employee.company.id,
        amount: totalGoldiesCost,
        medusa_order_id: orderId,
        performed_by: "system",
      },
    });
  } catch (error) {
    console.error(`Failed to spend Goldies for order ${orderId}:`, error);
    // In a production environment, this might need manual intervention or a retry mechanism
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
