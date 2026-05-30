import { MedusaService } from "@medusajs/framework/utils"
import Company from "./models/company"
import Agent from "./models/agent"
import Employee from "./models/employee"

class CompanyModuleService extends MedusaService({
  Company,
  Agent,
  Employee,
}) {}

export default CompanyModuleService