import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import GoldieModule from "../modules/goldie"

export default defineLink(
  ProductModule.linkable.productVariant,
  GoldieModule.linkable.variantGoldies
)
