import { initRemoteTable } from "./remoteTableController.js";
import { getCustomers } from "../models/customersModel.js";
export function initCustomers(query, rerender) { return initRemoteTable("customers", query, rerender, getCustomers); }
