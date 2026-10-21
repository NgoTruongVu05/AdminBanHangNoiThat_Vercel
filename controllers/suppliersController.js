import { initRemoteTable } from "./remoteTableController.js";
import { getSuppliers } from "../models/suppliersModel.js";
export function initSuppliers(query, rerender) { return initRemoteTable("suppliers", query, rerender, getSuppliers); }
