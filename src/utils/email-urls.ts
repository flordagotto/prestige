type ConfigModule = {
  admin?: {
    backendUrl?: string
    path?: string
  }
}

export function getStoreUrl(): string {
  return process.env.STORE_URL ?? "http://localhost:3000"
}

export function getAdminUrl(configModule: ConfigModule): string {
  const backendUrl =
    configModule.admin?.backendUrl && configModule.admin.backendUrl !== "/"
      ? configModule.admin.backendUrl
      : process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"

  const adminPath = configModule.admin?.path ?? "/app"

  return `${backendUrl}${adminPath}`
}
