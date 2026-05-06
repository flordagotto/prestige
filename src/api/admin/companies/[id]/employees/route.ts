import { MedusaResponse, MedusaRequest } from "@medusajs/framework/http"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  return res.status(403).json({ 
    message: "Only agents can create employees. Use POST /agent/employees instead." 
  })
}