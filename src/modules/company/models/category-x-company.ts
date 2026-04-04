import { model } from "@medusajs/framework/utils"
import Category from "./category"
import Company from "./company"

const CategoryXCompany = model.define("category_x_company", {
  id:       model.id().primaryKey(),
  category: model.belongsTo(() => Category, { mappedBy: "companies" }),
  company:  model.belongsTo(() => Company,  { mappedBy: "categories" }),
})

export default CategoryXCompany