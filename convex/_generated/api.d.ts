/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appVersions from "../appVersions.js";
import type * as bases from "../bases.js";
import type * as dataRequests from "../dataRequests.js";
import type * as documentAI from "../documentAI.js";
import type * as documentCalendar from "../documentCalendar.js";
import type * as documentIndex from "../documentIndex.js";
import type * as documentTasks from "../documentTasks.js";
import type * as documents from "../documents.js";
import type * as editorPresence from "../editorPresence.js";
import type * as emailDelivery from "../emailDelivery.js";
import type * as emailDrafts from "../emailDrafts.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as games from "../games.js";
import type * as gmailOAuthStates from "../gmailOAuthStates.js";
import type * as http from "../http.js";
import type * as integration_actions from "../integration_actions.js";
import type * as integrations from "../integrations.js";
import type * as leaderPresets from "../leaderPresets.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_credentials from "../lib/credentials.js";
import type * as lib_memberEmails from "../lib/memberEmails.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as mailer from "../mailer.js";
import type * as meetingFiles from "../meetingFiles.js";
import type * as meetings from "../meetings.js";
import type * as members from "../members.js";
import type * as mentions from "../mentions.js";
import type * as migrations from "../migrations.js";
import type * as migrations_001_migrate_member_fields from "../migrations/001_migrate_member_fields.js";
import type * as migrations_002_remove_integration_fields from "../migrations/002_remove_integration_fields.js";
import type * as migrations_003_secure_capabilities from "../migrations/003_secure_capabilities.js";
import type * as migrations_004_encrypt_credentials from "../migrations/004_encrypt_credentials.js";
import type * as migrations_005_trip_ticket_shares from "../migrations/005_trip_ticket_shares.js";
import type * as pages from "../pages.js";
import type * as presence from "../presence.js";
import type * as prosemirrorSync from "../prosemirrorSync.js";
import type * as publicTickets from "../publicTickets.js";
import type * as public_rsvp from "../public_rsvp.js";
import type * as rateLimits from "../rateLimits.js";
import type * as transportRoutes from "../transportRoutes.js";
import type * as transportTickets from "../transportTickets.js";
import type * as tripFinance from "../tripFinance.js";
import type * as tripParticipants from "../tripParticipants.js";
import type * as tripStaff from "../tripStaff.js";
import type * as tripTicketShares from "../tripTicketShares.js";
import type * as trips from "../trips.js";
import type * as troops from "../troops.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appVersions: typeof appVersions;
  bases: typeof bases;
  dataRequests: typeof dataRequests;
  documentAI: typeof documentAI;
  documentCalendar: typeof documentCalendar;
  documentIndex: typeof documentIndex;
  documentTasks: typeof documentTasks;
  documents: typeof documents;
  editorPresence: typeof editorPresence;
  emailDelivery: typeof emailDelivery;
  emailDrafts: typeof emailDrafts;
  feedback: typeof feedback;
  files: typeof files;
  games: typeof games;
  gmailOAuthStates: typeof gmailOAuthStates;
  http: typeof http;
  integration_actions: typeof integration_actions;
  integrations: typeof integrations;
  leaderPresets: typeof leaderPresets;
  "lib/auth": typeof lib_auth;
  "lib/credentials": typeof lib_credentials;
  "lib/memberEmails": typeof lib_memberEmails;
  "lib/tokens": typeof lib_tokens;
  mailer: typeof mailer;
  meetingFiles: typeof meetingFiles;
  meetings: typeof meetings;
  members: typeof members;
  mentions: typeof mentions;
  migrations: typeof migrations;
  "migrations/001_migrate_member_fields": typeof migrations_001_migrate_member_fields;
  "migrations/002_remove_integration_fields": typeof migrations_002_remove_integration_fields;
  "migrations/003_secure_capabilities": typeof migrations_003_secure_capabilities;
  "migrations/004_encrypt_credentials": typeof migrations_004_encrypt_credentials;
  "migrations/005_trip_ticket_shares": typeof migrations_005_trip_ticket_shares;
  pages: typeof pages;
  presence: typeof presence;
  prosemirrorSync: typeof prosemirrorSync;
  publicTickets: typeof publicTickets;
  public_rsvp: typeof public_rsvp;
  rateLimits: typeof rateLimits;
  transportRoutes: typeof transportRoutes;
  transportTickets: typeof transportTickets;
  tripFinance: typeof tripFinance;
  tripParticipants: typeof tripParticipants;
  tripStaff: typeof tripStaff;
  tripTicketShares: typeof tripTicketShares;
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

export declare const components: {
  prosemirrorSync: {
    lib: {
      deleteDocument: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        null
      >;
      deleteSnapshots: FunctionReference<
        "mutation",
        "internal",
        { afterVersion?: number; beforeVersion?: number; id: string },
        null
      >;
      deleteSteps: FunctionReference<
        "mutation",
        "internal",
        {
          afterVersion?: number;
          beforeTs: number;
          deleteNewerThanLatestSnapshot?: boolean;
          id: string;
        },
        null
      >;
      getSnapshot: FunctionReference<
        "query",
        "internal",
        { id: string; version?: number },
        { content: null } | { content: string; version: number }
      >;
      getSteps: FunctionReference<
        "query",
        "internal",
        { id: string; version: number },
        {
          clientIds: Array<string | number>;
          steps: Array<string>;
          version: number;
        }
      >;
      latestVersion: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | number
      >;
      submitSnapshot: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          id: string;
          pruneSnapshots?: boolean;
          version: number;
        },
        null
      >;
      submitSteps: FunctionReference<
        "mutation",
        "internal",
        {
          clientId: string | number;
          id: string;
          steps: Array<string>;
          version: number;
        },
        | {
            clientIds: Array<string | number>;
            status: "needs-rebase";
            steps: Array<string>;
          }
        | { status: "synced" }
      >;
    };
  };
};
