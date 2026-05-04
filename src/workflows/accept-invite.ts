import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import CompanyModuleService from "../modules/company/service"
import { COMPANY_MODULE } from "../modules/company"

type AcceptInviteInput = {
  token: string
  password: string
}

type InviteMetadata = {
  company_id: string
  role: "agent" | "employee"
  first_name: string
  last_name: string
}

type RegisterAuthInput = {
  email: string
  password: string
  url: string
  headers: Record<string, unknown>
  query: Record<string, unknown>
  protocol: string
}

type CreateCustomerInput = {
  first_name: string
  last_name: string
  email: string
}

type CreateActorInput = {
  customerId: string
  companyId: string
  role: "agent" | "employee"
}

type AcceptInviteWorkflowInput = AcceptInviteInput & {
  url: string
  headers: Record<string, unknown>
  query: Record<string, unknown>
  protocol: string
}

// ─── Step 1: validar token ───────────────────────────────

const validateInviteTokenStep = createStep(
  "validate-invite-token",
  async (input: AcceptInviteInput, { container }) => {
    const userService = container.resolve(Modules.USER)

    let invite
    try {
      invite = await userService.validateInviteToken(input.token)
    } catch {
      throw new Error("Invalid or expired token")
    }

    if (invite.accepted) {
      throw new Error("This invitation has already been accepted")
    }

    const metadata = invite.metadata as InviteMetadata

    if (!metadata?.company_id || !metadata?.role) {
      throw new Error("Invalid invitation: required fields missing")
    }

    return new StepResponse({ invite, metadata })
  }
)

// ─── Step 2: validar password ────────────────────────────

const validatePasswordStep = createStep(
  "validate-password",
  async (input: AcceptInviteInput, { container }) => {
    const { password } = input

    const logger = container.resolve("logger")

    if (password.length < 8) {
      logger.warn("Password too short")
      throw new Error("Password must contain 8 characters")
    }

    if (!/[A-Z]/.test(password)) {
      logger.warn("Password does not contain any upper characters")
      throw new Error("Password must contain at least one upper character")
    }

    if (!/[0-9]/.test(password)) {
      logger.warn("Password does not contain any numbers")
      throw new Error("Password must contain at least one number")
    }

    logger.info("Password validated")
    return new StepResponse({ valid: true })
  }
)

// ─── Step 3: register auth identity ─────────────────────

const registerAuthIdentityStep = createStep(
  "register-auth-identity",
  async (input: RegisterAuthInput, { container }) => {
    const authService = container.resolve(Modules.AUTH)
    const logger = container.resolve("logger")

    const { success, authIdentity, error } = await authService.register(
      "emailpass",
      {
        url: input.url,
        headers: input.headers as unknown as Record<string, string>,
        query: input.query as unknown as Record<string, string>,
        body: { email: input.email, password: input.password },
        protocol: input.protocol,
      }
    )

    if (!success || !authIdentity) {
      logger.error(`Failed to register auth identity for email: ${input.email}`)
      throw new Error(error || "Failed to create credentials")
    }

    logger.info(`Auth identity created for email: ${input.email}`)
    return new StepResponse({ authIdentity }, authIdentity.id)
  },
  async (authIdentityId: string | undefined, { container }) => {
    if (!authIdentityId) return
    const authService = container.resolve(Modules.AUTH)
    const logger = container.resolve("logger")
    await authService.deleteAuthIdentities([authIdentityId])
    logger.warn(`Rolled back auth identity: ${authIdentityId}`)
  }
)

// ─── Step 4: create customer ─────────────────────────────

const createCustomerStep = createStep(
  "create-customer",
  async (input: CreateCustomerInput, { container }) => {
    const customerService = container.resolve(Modules.CUSTOMER)
    const logger = container.resolve("logger")

    const customer = await customerService.createCustomers({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
    })

    logger.info(`Customer created: ${customer.id}`)
    return new StepResponse({ customer }, customer.id)
  },
  async (customerId: string | undefined, { container }) => {
    if (!customerId) return
    const customerService = container.resolve(Modules.CUSTOMER)
    const logger = container.resolve("logger")
    await customerService.deleteCustomers(customerId)
    logger.warn(`Rolled back customer: ${customerId}`)
  }
)

// ─── Step 5: link auth identity to customer ──────────────

type LinkAuthIdentityInput = {
  authIdentityId: string
  customerId: string
}

const linkAuthIdentityStep = createStep(
  "link-auth-identity",
  async (input: LinkAuthIdentityInput, { container }) => {
    const authService = container.resolve(Modules.AUTH)
    const logger = container.resolve("logger")

    await authService.updateAuthIdentities({
      id: input.authIdentityId,
      app_metadata: {
        customer_id: input.customerId,
      },
    })

    logger.info(`Auth identity ${input.authIdentityId} linked to customer ${input.customerId}`)
    return new StepResponse({ success: true }, input)
  },
  async (
    input: LinkAuthIdentityInput | undefined,
    { container }
  ) => {
    if (!input) return
    const authService = container.resolve(Modules.AUTH)
    const logger = container.resolve("logger")
    await authService.updateAuthIdentities({
      id: input.authIdentityId,
      app_metadata: {},
    })
    logger.warn(`Rolled back auth identity link: ${input.authIdentityId}`)
  }
)

// ─── Step 6: create agent or employee ────────────────────

const createActorStep = createStep(
  "create-actor",
  async (input: CreateActorInput, { container }) => {
    const companyService: CompanyModuleService = container.resolve(COMPANY_MODULE)
    const logger = container.resolve("logger")

    if (input.role === "agent") {
      const agent = await companyService.createAgents({
        user_id: input.customerId,
        company_id: input.companyId,
      })
      logger.info(`Agent created: ${agent.id} for company: ${input.companyId}`)
      return new StepResponse({ actor: agent }, { id: agent.id, role: "agent" as const })
    }

    const employee = await companyService.createEmployees({
      user_id: input.customerId,
      company_id: input.companyId,
    })
    logger.info(`Employee created: ${employee.id} for company: ${input.companyId}`)
    return new StepResponse({ actor: employee }, { id: employee.id, role: "employee" as const })
  },
  async (
    actorData: { id: string; role: "agent" | "employee" } | undefined,
    { container }
  ) => {
    if (!actorData) return
    const companyService: CompanyModuleService = container.resolve(COMPANY_MODULE)
    const logger = container.resolve("logger")

    if (actorData.role === "agent") {
      await companyService.deleteAgents(actorData.id)
      logger.warn(`Rolled back agent: ${actorData.id}`)
    } else {
      await companyService.deleteEmployees(actorData.id)
      logger.warn(`Rolled back employee: ${actorData.id}`)
    }
  }
)

// ─── Step 7: accept invite ───────────────────────────────

const acceptInviteStep = createStep(
  "accept-invite",
  async (inviteId: string, { container }) => {
    const userService = container.resolve(Modules.USER)
    const logger = container.resolve("logger")

    await userService.updateInvites({
      id: inviteId,
      accepted: true,
    })

    logger.info(`Invite accepted: ${inviteId}`)
    return new StepResponse({ success: true }, inviteId)
  },
  async (inviteId: string | undefined, { container }) => {
    if (!inviteId) return
    const userService = container.resolve(Modules.USER)
    const logger = container.resolve("logger")
    await userService.updateInvites({
      id: inviteId,
      accepted: false,
    })
    logger.warn(`Rolled back invite acceptance: ${inviteId}`)
  }
)

export const acceptInviteWorkflow = createWorkflow(
  "accept-invite",
  (input: AcceptInviteWorkflowInput) => {
    const { invite, metadata } = validateInviteTokenStep(input)
    validatePasswordStep(input)

    const { authIdentity } = registerAuthIdentityStep({
      email: invite.email,
      password: input.password,
      url: input.url,
      headers: input.headers,
      query: input.query,
      protocol: input.protocol,
    })

    const { customer } = createCustomerStep({
      first_name: metadata.first_name,
      last_name: metadata.last_name,
      email: invite.email,
    })

    linkAuthIdentityStep({
      authIdentityId: authIdentity.id,
      customerId: customer.id,
    })

    createActorStep({
      customerId: customer.id,
      companyId: metadata.company_id,
      role: metadata.role,
    })

    acceptInviteStep(invite.id)

    return new WorkflowResponse({ success: true })
  }
)