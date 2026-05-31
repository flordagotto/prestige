import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { getStoreUrl } from "../utils/email-urls"

type InviteCreatedPayload = { id: string } | { id: string }[]

function normalizeInviteIds(data: InviteCreatedPayload): string[] {
  if (Array.isArray(data)) {
    return data.map((item) => item.id)
  }

  return [data.id]
}

export default async function inviteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<InviteCreatedPayload>) {
  const userService = container.resolve(Modules.USER)
  const notification = container.resolve(Modules.NOTIFICATION)
  const logger = container.resolve("logger")
  const storeUrl = getStoreUrl()

  for (const inviteId of normalizeInviteIds(data)) {
    const invite = await userService.retrieveInvite(inviteId)
    const metadata = invite.metadata as Record<string, unknown> | null
    const role = metadata?.role ?? "user"

    const invite_url = `${storeUrl}/register?token=${encodeURIComponent(invite.token)}`

    await notification.createNotifications({
      to: invite.email,
      channel: "email",
      content: {
        subject: "You're invited to Prestige Rewards",
        html: `<p>You've been invited as <strong>${role}</strong>.</p><p><a href="${invite_url}">Complete registration</a></p>`,
      },
      data: { invite_url, role, email: invite.email },
    })

    logger.info(`Invite email queued for ${invite.email} (${role})`)
  }
}

export const config: SubscriberConfig = {
  event: "invite.created",
}
