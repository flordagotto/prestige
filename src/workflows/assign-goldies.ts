import { createWorkflow, createStep, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import company, { COMPANY_MODULE } from "../modules/company"
import { GOLDIE_MODULE } from "../modules/goldie"
import CompanyModuleService from "../modules/company/service"
import GoldieModuleService from "../modules/goldie/service"

// ─── Tipos ───────────────────────────────────────────────

type AssignToCompanyInput = {
  company_id: string
  amount: number
  performed_by: string
  note?: string
}

type AssignToEmployeeInput = {
  company_id: string
  employee_id: string
  amount: number
  performed_by: string
}

// ─── Step 1A: asignar puntos a la empresa ───────────

const assignGoldiesToCompanyStep = createStep(
  "update-company-balance",
  async (input: AssignToCompanyInput, { container }) => {
    if (input.amount <= 0) {
      throw new Error(`The amount of Goldies to assign must be higher than 0. Received: ${input.amount}`)
    }

    const companyService: CompanyModuleService = container.resolve(COMPANY_MODULE)

    const company = await companyService.retrieveCompany(input.company_id)

    const companyId = company.id;
    const oldGoldieBalance = company.goldie_balance ?? 0

    await companyService.updateCompanies({
      id: input.company_id,
      goldie_balance: oldGoldieBalance + input.amount,
    })

    return new StepResponse(input, {
        companyId,
        previousCompanyBalance: oldGoldieBalance
    })
  },
  async (
        compensationInput: { companyId: string; previousCompanyBalance: number } | undefined,
        { container }
    ) =>
    {
        if (!compensationInput) return

        const { previousCompanyBalance, companyId } = compensationInput

        const companyService: CompanyModuleService = container.resolve(COMPANY_MODULE)

        await companyService.updateCompanies({
            id: companyId,
            goldie_balance: previousCompanyBalance,
        })
    }
)

// ─── Step 1B: asignar puntos al empleado y actualizar balance de la empresa ───

const assignGoldiesToEmployeeStep = createStep(
  "update-employee-balance",
  async (input: AssignToEmployeeInput, { container }) => {
    if (input.amount <= 0) {
      throw new Error(`The amount of Goldies to assign must be higher than 0. Received: ${input.amount}`)
    }

    const companyService: CompanyModuleService = container.resolve(COMPANY_MODULE)

    const company = await companyService.retrieveCompany(input.company_id)
    const employee = await companyService.retrieveEmployee(input.employee_id)

    const companyId = company.id;
    const employeeId = employee.id;
    const oldCompanyGoldieBalance = company.goldie_balance ?? 0
    const oldEmployeeGoldieBalance = employee.goldie_balance ?? 0

    if (oldCompanyGoldieBalance < input.amount) {
      throw new Error(`Not enough Goldies. Company has ${company.goldie_balance} goldies available and ${input.amount} are required`)
    }

    await companyService.updateCompanies({
      id: input.company_id,
      goldie_balance: oldCompanyGoldieBalance - input.amount,
    })

    await companyService.updateEmployees({
      id: input.employee_id,
      goldie_balance: oldEmployeeGoldieBalance + input.amount,
    })

    return new StepResponse(input, {
      companyId,
      employeeId,
      previousCompanyBalance: oldCompanyGoldieBalance,
      previousEmployeeBalance: oldEmployeeGoldieBalance,
    })
  },
  // rollback: revertimos ambos balances
  async (
    compensationInput: { 
        companyId: string,
        employeeId: string,
        previousCompanyBalance: number, 
        previousEmployeeBalance: number
     } | undefined,
     { container }
    ) => {
        if (!compensationInput) return

        const { companyId, employeeId, previousCompanyBalance, previousEmployeeBalance } = compensationInput

        const companyService: CompanyModuleService = container.resolve(COMPANY_MODULE)

        await companyService.updateCompanies({
            id: companyId,
            goldie_balance: previousCompanyBalance,
        })

        await companyService.updateEmployees({
            id: employeeId,
            goldie_balance: previousEmployeeBalance,
        })
  }
)

// ─── Step 2: registrar la transacción ────────────────────

const registerTransactionStep = createStep(
  "register-transaction",
  async (input: AssignToCompanyInput | AssignToEmployeeInput, { container }) => {
    const goldieService: GoldieModuleService = container.resolve(GOLDIE_MODULE)

    const isEmployeeAssignment = "employee_id" in input // no me gusta pero vamos a cambiar el esquema de bd asi q esto seguro vuela

    const transaction = await goldieService.createGoldieTransactions({
      type: isEmployeeAssignment ? "employee_assignment" : "company_assignment", //deberiamos crear un enum pero vamos a cambiar el esquema de bd asi q esto seguro vuela
      company_id: input.company_id,
      employee_id: isEmployeeAssignment ? (input as AssignToEmployeeInput).employee_id : null,
      amount: input.amount,
      performed_by: input.performed_by,
      note: (input as AssignToCompanyInput).note ?? null,
    })

    return new StepResponse(transaction, transaction.id)
  },
  // rollback: eliminar la transacción registrada
  async (transactionId: string | undefined, { container }) => {
    if(!transactionId) return

    const goldieService: GoldieModuleService = container.resolve(GOLDIE_MODULE)
    await goldieService.deleteGoldieTransactions(transactionId)
  }
)

// ─── Workflow A: admin asigna goldies a empresa ──────────

export const assignGoldiesToCompanyWorkflow = createWorkflow(
  "assign-goldies-to-company",
  (input: AssignToCompanyInput) => {
    assignGoldiesToCompanyStep(input)
    registerTransactionStep(input)
    return new WorkflowResponse({ success: true })
  }
)

// ─── Workflow B: agent asigna goldies a employee ─────────

export const assignGoldiesToEmployeeWorkflow = createWorkflow(
  "assign-goldies-to-employee",
  (input: AssignToEmployeeInput) => {
    assignGoldiesToEmployeeStep(input)
    registerTransactionStep(input)
    return new WorkflowResponse({ success: true })
  }
)