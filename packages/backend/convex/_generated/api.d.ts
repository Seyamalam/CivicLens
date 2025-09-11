/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as bribeLogs from "../bribeLogs.js";
import type * as healthCheck from "../healthCheck.js";
import type * as permits from "../permits.js";
import type * as procurement from "../procurement.js";
import type * as projects from "../projects.js";
import type * as rti from "../rti.js";
import type * as seedData from "../seedData.js";
import type * as services from "../services.js";
import type * as todos from "../todos.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bribeLogs: typeof bribeLogs;
  healthCheck: typeof healthCheck;
  permits: typeof permits;
  procurement: typeof procurement;
  projects: typeof projects;
  rti: typeof rti;
  seedData: typeof seedData;
  services: typeof services;
  todos: typeof todos;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
