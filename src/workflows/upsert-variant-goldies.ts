import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { GOLDIE_MODULE } from "../modules/goldie"
import { Modules } from "@medusajs/framework/utils"

export const upsertVariantGoldiesStep = createStep(
  "upsert-variant-goldies-step",
  async (input: { variant_id: string, goldies_cost: number }, { container }) => {
    const goldieModuleService = container.resolve(GOLDIE_MODULE)
    const remoteLink = container.resolve("remoteLink")
    const query = container.resolve("query")

    // Find existing link
    const { data: [variant] } = await query.graph({
      entity: "product_variant",
      fields: ["variant_goldies.*"],
      filters: { id: input.variant_id }
    })

    let variantGoldiesId = variant?.variant_goldies?.id

    if (variantGoldiesId) {
      await goldieModuleService.updateVariantGoldies({
        id: variantGoldiesId,
        goldies_cost: input.goldies_cost
      })
    } else {
      const variantGoldies = await goldieModuleService.createVariantGoldies({
        goldies_cost: input.goldies_cost
      })
      variantGoldiesId = variantGoldies.id

      await remoteLink.create({
        [Modules.PRODUCT]: {
          product_variant_id: input.variant_id
        },
        [GOLDIE_MODULE]: {
          variant_goldies_id: variantGoldiesId
        }
      })
    }

    return new StepResponse({ variantGoldiesId })
  }
)

export const upsertVariantGoldiesWorkflow = createWorkflow(
  "upsert-variant-goldies",
  (input: { variant_id: string, goldies_cost: number }) => {
    return new WorkflowResponse(upsertVariantGoldiesStep(input))
  }
)
