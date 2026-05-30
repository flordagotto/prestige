import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProductVariant } from "@medusajs/framework/types"
import { Container, Heading, Input, Button, toast, Text } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

const VariantGoldiesWidget = ({ data: variant }: DetailWidgetProps<AdminProductVariant>) => {
  const queryClient = useQueryClient()
  const [goldiesCost, setGoldiesCost] = useState<number>(0)

  // Fetch current goldies cost
  useEffect(() => {
    const fetchGoldies = async () => {
      try {
        const response = await sdk.client.fetch<{ goldies_cost: number }>(`/admin/product-variants/${variant.id}/goldies`, { method: 'GET' })
        if (response && typeof response.goldies_cost === 'number') {
          setGoldiesCost(response.goldies_cost)
        }
      } catch (e) {
        console.error("Failed to fetch goldies cost", e)
      }
    }
    fetchGoldies()
  }, [variant.id])

  const { mutate, isPending } = useMutation({
    mutationFn: async (goldies: number) => {
      return sdk.client.fetch(`/admin/product-variants/${variant.id}/goldies`, {
        method: 'POST',
        body: { goldies_cost: goldies }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", variant.id] })
      toast.success("Variant goldies cost updated")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update goldies cost")
    },
  })

  const handleSave = () => {
    mutate(goldiesCost)
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Goldies Cost</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Set the amount of Goldies required to redeem this variant.
          </Text>
        </div>
      </div>
      <div className="px-6 py-4">
        <div className="flex items-center gap-x-2 max-w-[300px]">
          <Input 
            type="number" 
            min="0"
            value={goldiesCost} 
            onChange={(e) => setGoldiesCost(Number(e.target.value))} 
            placeholder="0"
          />
          <Button 
            variant="secondary" 
            onClick={handleSave}
            isLoading={isPending}
            size="small"
          >
            Save
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.side.after",
})

export default VariantGoldiesWidget
