import { addToCartWorkflow, updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows";
import { MedusaError } from "@medusajs/framework/utils";

// We limit the cart to 1 item total for Goldie product redemptions
// and enforce all Goldie-related business rules.
/**
 * RULES IMPLEMENTED:
 * 1. Insufficient employee points: Check if employee.goldie_balance >= product.goldies_cost.
 * 2. Product requires Goldies but has no price set: Prevent adding if goldies_cost is 0 or null.
 * 3. Employee doesn't belong to any company: Block if no linked employee record found for customer.
 * 4. Employee is inactive: Check employee.status === "active".
 * 5. Company is inactive: Check company.status === "active".
 * 6. Duplicate product in cart: Block adding the same variant_id twice.
 */
addToCartWorkflow.hooks.validate(
  async ({ input, cart }, { container }) => {
    const items = input.items || [];
    const query = container.resolve("query");

    // 1. Basic quantity check (max 1 item total in cart)
    // We re-fetch the cart to ensure we have the latest items (Medusa might pass a stale cart object to the hook)
    const { data: [fullCart] } = await query.graph({
      entity: "cart",
      fields: ["items.*"],
      filters: { id: cart.id }
    });

    const cartItems = fullCart.items || [];
    const currentQuantity = cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const addedQuantity = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
    
    if (currentQuantity + addedQuantity > 1) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED, 
        "Cart cannot contain more than 1 item for redemption. Please checkout or remove the current item."
      );
    }

    // 2. Resolve Employee and Company status (Rules 3, 4, 5)
    const { data: [employee] } = await query.graph({
      entity: "employee",
      fields: ["id", "status", "goldie_balance", "company.status"],
      filters: { customer_id: cart.customer_id }
    });

    if (!employee) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Your account is not linked to an employee profile. Contact your company administrator."
      );
    }

    if (employee.status !== "active") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Your employee account is inactive. Contact your company administrator."
      );
    }

    if (employee.company?.status !== "active") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Your company account is currently inactive. Contact your company administrator."
      );
    }

    // 3. Validate each item being added (Rules 1, 2, 6)
    for (const item of items) {
      // Rule 6: Duplicate check
      const isDuplicate = cartItems.some((cartItem: any) => cartItem.variant_id === item.variant_id);
      if (isDuplicate) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "This product is already in your cart. Remove it before adding it again."
        );
      }

      // Rule 2: Pricing check (must have goldies_cost > 0)
      const { data: [variant] } = await query.graph({
        entity: "product_variant",
        fields: ["variant_goldies.goldies_cost"],
        filters: { id: item.variant_id }
      });

      const goldiesCost = variant?.variant_goldies?.goldies_cost;
      if (!goldiesCost || goldiesCost <= 0) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "This product is not available for Goldie redemption."
        );
      }

      // Rule 1: Balance check
      if (employee.goldie_balance < goldiesCost) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Not enough Goldies. You have ${employee.goldie_balance} Goldies but this product costs ${goldiesCost}.`
        );
      }
    }
  }
);

updateLineItemInCartWorkflow.hooks.validate(
  async (payload: any, { container }) => {
    // The payload usually contains `cart`, `item`, and `update` or `input`.
    const updateData = payload.update || payload.input || payload.data;
    const newQuantity = updateData?.quantity;
    
    if (newQuantity !== undefined && newQuantity > 1) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED, 
        "Quantity cannot exceed 1 for redemption items."
      );
    }
  }
);
