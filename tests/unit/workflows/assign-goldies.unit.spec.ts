import {
  assignGoldiesToCompanyWorkflow,
  assignGoldiesToEmployeeWorkflow,
} from "../assign-goldies"

describe("assignGoldiesToCompanyWorkflow", () => {
  describe("amount", () => {
    it("falla si amount es 0", async () => {
      const { errors } = await assignGoldiesToCompanyWorkflow().run({
        input: {
          company_id: "company_123",
          amount: 0,
          performed_by: "admin_123",
        },
        throwOnError: false,
      })

      expect(errors[0].error.message).toContain(
        "The amount of Goldies to assign must be higher than 0"
      )
    })

    it("falla si amount es negativo", async () => {
      const { errors } = await assignGoldiesToCompanyWorkflow().run({
        input: {
          company_id: "company_123",
          amount: -50,
          performed_by: "admin_123",
        },
        throwOnError: false,
      })

      expect(errors[0].error.message).toContain(
        "The amount of Goldies to assign must be higher than 0"
      )
    })
  })
})

describe("assignGoldiesToEmployeeWorkflow", () => {
  describe("amount", () => {
    it("falla si amount es 0", async () => {
      const { errors } = await assignGoldiesToEmployeeWorkflow().run({
        input: {
          company_id: "company_123",
          employee_id: "employee_123",
          amount: 0,
          performed_by: "agent_123",
        },
        throwOnError: false,
      })

      expect(errors[0].error.message).toContain(
        "The amount of Goldies to assign must be higher than 0"
      )
    })

    it("falla si amount es negativo", async () => {
      const { errors } = await assignGoldiesToEmployeeWorkflow().run({
        input: {
          company_id: "company_123",
          employee_id: "employee_123",
          amount: -10,
          performed_by: "agent_123",
        },
        throwOnError: false,
      })

      expect(errors[0].error.message).toContain(
        "The amount of Goldies to assign must be higher than 0"
      )
    })
  })
})
