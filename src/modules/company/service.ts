import { MedusaService } from "@medusajs/framework/utils"
import Category from "./models/category"
import CategoryXCompany from "./models/category-x-company"
import Company from "./models/company"
import Agent from "./models/agent"
import Employee from "./models/employee"

class CompanyModuleService extends MedusaService({
  Category,
  CategoryXCompany,
  Company,
  Agent,
  Employee,
}) {}

export default CompanyModuleService