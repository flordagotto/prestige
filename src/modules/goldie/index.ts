import { Module } from "@medusajs/framework/utils"
import GoldieModuleService from "./service"

export const GOLDIE_MODULE = "goldie"

export default Module(GOLDIE_MODULE, {
  service: GoldieModuleService,
})