import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { MedusaError } from "@medusajs/framework/utils";

/**
 * RULES IMPLEMENTED:
 * 7. Re-validate employee balance at checkout: Check if balance >= total cost.
 *    This acts as a second-line defense in case the balance changed between cart-entry and checkout.
 * 10. Goldies total matches: Sanity check to ensure all items in the cart have valid goldie costs.
 */
completeCartWorkflow.hooks.validate(
  async ({ cart }, { container }) => {
    const query = container.resolve("query");

    if (!cart || !cart.customer_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "You must be logged in to complete a redemption."
      );
    }

    // 1. Resolve Employee (Fresh read from DB)
    const { data: [employee] } = await query.graph({
      entity: "employee",
      fields: ["id", "goldie_balance"],
      filters: { customer_id: cart.customer_id }
    });

    if (!employee) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Employee profile not found. Contact your company administrator."
      );
    }

    // 2. Calculate total Goldie cost
    let totalGoldiesCost = 0;
    const cartItems = cart.items || [];

    for (const item of cartItems) {
      const { data: [variant] } = await query.graph({
        entity: "product_variant",
        fields: ["variant_goldies.goldies_cost"],
        filters: { id: item.variant_id }
      });

      const goldiesCost = variant?.variant_goldies?.goldies_cost;
      
      // Rule 10: Sanity check - every item must have a valid cost
      if (goldiesCost === undefined || goldiesCost === null || goldiesCost <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The item "${item.title}" is no longer available for Goldie redemption.`
        );
      }

      totalGoldiesCost += goldiesCost * item.quantity;
    }

    // Rule 7: Final balance check
    if (employee.goldie_balance < totalGoldiesCost) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Your Goldie balance has changed. You have ${employee.goldie_balance} Goldies but this order requires ${totalGoldiesCost}.`
      );
    }
  }
);
