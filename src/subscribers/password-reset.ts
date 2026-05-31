import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { getAdminUrl, getStoreUrl } from "../utils/email-urls"

type PasswordResetPayload = {
  entity_id: string
  token: string
  actor_type: string
}

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetPayload>) {
  const notification = container.resolve(Modules.NOTIFICATION)
  const configModule = container.resolve("configModule")
  const logger = container.resolve("logger")

  const { entity_id: email, token, actor_type } = data
  const storeUrl = getStoreUrl()

  const reset_url =
    actor_type === "customer"
      ? `${storeUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
      : `${getAdminUrl(configModule)}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  await notification.createNotifications({
    to: email,
    channel: "email",
    content: {
      subject: "Reset your password",
      html: `<p>You requested a password reset.</p><p><a href="${reset_url}">Reset password</a></p>`,
    },
    data: { reset_url, email },
  })

  logger.info(`Password reset email queued for ${email} (${actor_type})`)
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
