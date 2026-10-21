import { initRemoteTable } from "./remoteTableController.js";
import { getStaff } from "../models/staffModel.js";
export function initStaff(query, rerender) { return initRemoteTable("staff", query, rerender, getStaff); }
