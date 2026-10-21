import { initRemoteTable } from "./remoteTableController.js";
import { getStyles } from "../models/stylesModel.js";
export function initStyles(query, rerender) { return initRemoteTable("styles", query, rerender, getStyles); }
