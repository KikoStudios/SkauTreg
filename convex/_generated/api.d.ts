/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bases from "../bases.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as members from "../members.js";
import type * as migrations from "../migrations.js";
import type * as public_rsvp from "../public_rsvp.js";
import type * as trips from "../trips.js";
import type * as troops from "../troops.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bases: typeof bases;
  files: typeof files;
  http: typeof http;
  members: typeof members;
  migrations: typeof migrations;
  public_rsvp: typeof public_rsvp;
  trips: typeof trips;
  troops: typeof troops;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
