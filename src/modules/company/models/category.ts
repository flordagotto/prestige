import { model } from "@medusajs/framework/utils"

const Category = model.define("category", {
  id:       model.id().primaryKey(),
  name:     model.text(),
  slug:     model.text(),
  companies: model.hasMany(() => {
    const CategoryXCompany = require("./category-x-company").default
    return CategoryXCompany
  }, { mappedBy: "category" }),
})

export default Category