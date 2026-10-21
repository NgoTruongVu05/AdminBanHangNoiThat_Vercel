import { initRemoteTable } from "./remoteTableController.js";
import { getAccounts } from "../models/accountsModel.js";
export function initAccounts(query, rerender) { return initRemoteTable("accounts", query, rerender, getAccounts); }
