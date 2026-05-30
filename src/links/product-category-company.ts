import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import CompanyModule from "../modules/company"

export default defineLink(
  ProductModule.linkable.productCategory,
  CompanyModule.linkable.company
)
