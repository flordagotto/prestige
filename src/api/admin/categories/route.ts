import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../modules/company"
import CompanyModuleService from "../../../modules/company/service"
import { AddProductCategoryBodyType } from "./validators"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const categories = await companyService.listCategories()

  res.json({ categories })
}

export async function POST(
  req: MedusaRequest<AddProductCategoryBodyType>,
  res: MedusaResponse
) {
  const companyService: CompanyModuleService = req.scope.resolve(COMPANY_MODULE)

  const { name, description } = req.validatedBody

  const category = await companyService.createCategories({  
      name,
      slug: description // TODO: hay q borrar la tabla Category y usar ProductCategory
  })

  res.json({ category })
}