import { initRemoteTable } from "./remoteTableController.js";
import { getPromotions } from "../models/promotionsModel.js";
export function initPromotions(query, rerender) { return initRemoteTable("promotions", query, rerender, getPromotions); }
