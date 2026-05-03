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