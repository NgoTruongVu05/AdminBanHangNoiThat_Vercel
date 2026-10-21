import { initRemoteTable } from "./remoteTableController.js";
import { getImports } from "../models/importsModel.js";
export function initImports(query, rerender) { return initRemoteTable("imports", query, rerender, getImports); }
