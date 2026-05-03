import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

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