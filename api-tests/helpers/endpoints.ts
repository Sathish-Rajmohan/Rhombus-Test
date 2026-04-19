/**
 * API contract definitions for api.rhombusai.com.
 *
 * All endpoints and field names are derived from HAR capture of a live
 * browser session. Nothing here is guessed; every constant matches what
 * the real UI sends.
 *
 * Architecture:
 *   Frontend:  https://rhombusai.com        (Next.js + NextAuth)
 *   API:       https://api.rhombusai.com    (REST, Bearer-token auth)
 *
 * Auth flow:
 *   1. GET https://rhombusai.com/api/auth/session -> { accessToken: "eyJ..." }
 *   2. All api.rhombusai.com requests send Authorization: Bearer <accessToken>.
 */

import { env } from '@shared/env';

export const FRONTEND_BASE_URL = env.RHOMBUS_BASE_URL;

export const API_BASE_URL = env.RHOMBUS_API_URL;

/** Returns { accessToken, user, expires } for the authenticated session. */
export const SESSION_ENDPOINT = '/api/auth/session';

/**
 * Protected user profile endpoint.
 *   200 + { first_name, last_name, ... } when authed.
 *   401 / 403 when the Authorization header is missing or invalid.
 */
export const PROFILE_ENDPOINT = '/api/accounts/users/profile';

/**
 * Upload a CSV as a temporary dataset.
 *
 * multipart/form-data fields:
 *   file              : the CSV file blob
 *   title             : filename string (e.g. "messy.csv")
 *   description       : empty string
 *   column_header_row : "1"   (1-indexed; API rejects "0")
 *
 * 200 -> { id: number, title: string, file_size: number, ... }
 */
export const TEMP_UPLOAD_ENDPOINT = '/api/dataset/datasets/temp/upload';

export const UPLOAD_FIELDS = {
  file: 'file',
  title: 'title',
  description: 'description',
  columnHeaderRow: 'column_header_row',
} as const;

export interface TempUploadResponse {
  id: number;
  title: string;
  file_size: number;
  content_type: string;
  object_url: string;
}

/** Header row emitted by the pipeline; must match fixtures/input/messy.csv. */
export const EXPECTED_CSV_HEADER = 'id,first_name,last_name,email,signup_date,amount,country';

/** Natural-language prompt driven through the chat UI for the transformation. */
export const TRANSFORMATION_PROMPT =
  'Remove duplicate rows and standardize text columns: trim whitespace on all text fields, title-case first_name and last_name, lowercase email, and uppercase country.';
