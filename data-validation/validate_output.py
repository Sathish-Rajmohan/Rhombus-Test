"""CLI data validation for the Rhombus AI pipeline output.

Usage:
    python validate_output.py --output <path/to/output.csv> [--input <path/to/messy.csv>]

Exits 0 on success, 1 on any assertion failure. Each failure is prefixed
with a short bracketed tag so a CI log reader can jump straight to the
broken rule. When --input is supplied, the validator also cross-correlates
the output against the input CSV (the one the user actually uploaded): row
count delta, id coverage, and normalized-email coverage.
"""

from __future__ import annotations

import argparse
import pathlib
import sys

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from schema import EXPECTED_COLUMNS, NOT_NULL_COLUMNS
from rules import (
    AMOUNT_ABS_TOLERANCE,
    AMOUNT_NON_NEGATIVE,
    EXPECTED_ROW_COUNT,
    ID_COLUMN_UNIQUE,
    TEXT_COLUMNS,
    country_is_uppercase,
    email_is_valid_and_lowercase,
    no_leading_trailing_whitespace,
    signup_date_is_iso,
)


def _normalize_email(value: object) -> str:
    """Lowercase + strip so input and output emails compare set-wise."""
    return str(value).strip().lower()


def _input_dedup(df: pd.DataFrame) -> pd.DataFrame:
    """Drop exact-duplicate rows after text normalization.

    The input CSV carries mixed casing and padding, so a raw drop_duplicates
    would miss rows that differ only in whitespace or letter case. Normalize
    text columns before deduping so the post-dedup row count matches what a
    sane transformation pipeline would produce.
    """
    norm = df.copy()
    for col in TEXT_COLUMNS:
        if col in norm.columns:
            norm[col] = norm[col].astype(str).str.strip().str.lower()
    norm = norm.drop_duplicates()
    return df.loc[norm.index]


def _run_output_only_checks(df: pd.DataFrame) -> list[str]:
    """Schema, row count, casing, whitespace, tolerance, dtype."""
    failures: list[str] = []

    actual_cols = list(df.columns)
    if actual_cols != EXPECTED_COLUMNS:
        failures.append(
            f'[columns] Column mismatch.\n'
            f'  Expected: {EXPECTED_COLUMNS}\n'
            f'  Actual:   {actual_cols}'
        )

    for col in NOT_NULL_COLUMNS:
        if col not in df.columns:
            continue
        null_count = int(df[col].isna().sum())
        if null_count > 0:
            failures.append(f'[nulls] Column "{col}" has {null_count} null value(s).')

    actual_rows = len(df)
    if actual_rows != EXPECTED_ROW_COUNT:
        failures.append(
            f'[row-count] Row count is {actual_rows}, expected {EXPECTED_ROW_COUNT}.'
        )

    if ID_COLUMN_UNIQUE and 'id' in df.columns:
        dupes = int(df['id'].duplicated().sum())
        if dupes > 0:
            failures.append(f'[id-unique] "id" column has {dupes} duplicate value(s).')

    full_dupes = int(df.duplicated().sum())
    if full_dupes > 0:
        failures.append(f'[duplicate-rows] Output has {full_dupes} fully duplicate row(s).')

    if 'email' in df.columns:
        bad_email = df[~df['email'].astype(str).apply(email_is_valid_and_lowercase)]
        if not bad_email.empty:
            failures.append(
                f'[email] {len(bad_email)} email(s) are invalid or not lowercase:\n'
                + bad_email['email'].to_string()
            )

    if 'country' in df.columns:
        bad_country = df[~df['country'].astype(str).apply(country_is_uppercase)]
        if not bad_country.empty:
            failures.append(
                f'[country] {len(bad_country)} country value(s) are not uppercase:\n'
                + bad_country['country'].to_string()
            )

    for col in TEXT_COLUMNS:
        if col not in df.columns:
            continue
        bad_ws = df[~df[col].astype(str).apply(no_leading_trailing_whitespace)]
        if not bad_ws.empty:
            failures.append(
                f'[whitespace] Column "{col}" has {len(bad_ws)} value(s) with leading/trailing whitespace.'
            )

    if AMOUNT_NON_NEGATIVE and 'amount' in df.columns:
        try:
            amounts = pd.to_numeric(df['amount'], errors='coerce')
            neg = df[amounts < -AMOUNT_ABS_TOLERANCE]
            if not neg.empty:
                failures.append(
                    f'[amount] {len(neg)} row(s) have negative amount:\n'
                    + neg['amount'].to_string()
                )
        except Exception as exc:
            failures.append(f'[amount] Could not check amount: {exc}')

    if 'signup_date' in df.columns:
        bad_date = df[~df['signup_date'].astype(str).apply(signup_date_is_iso)]
        if not bad_date.empty:
            failures.append(
                f'[signup-date] {len(bad_date)} value(s) not in YYYY-MM-DD format:\n'
                + bad_date['signup_date'].to_string()
            )

    if 'id' in df.columns:
        try:
            pd.to_numeric(df['id'], errors='raise')
        except Exception as exc:
            failures.append(f'[dtype] "id" column cannot be coerced to numeric: {exc}')

    if 'amount' in df.columns:
        try:
            pd.to_numeric(df['amount'], errors='raise')
        except Exception as exc:
            failures.append(f'[dtype] "amount" column cannot be coerced to numeric: {exc}')

    return failures


def _run_input_output_checks(input_df: pd.DataFrame, output_df: pd.DataFrame) -> list[str]:
    """Correlate the user-uploaded input CSV with the produced output CSV.

    Spec requires the validator use BOTH the input and the transformed output.
    These checks catch failure modes that invariant-only checks miss: a
    pipeline that drops all rows, a pipeline that fabricates ids, or a
    pipeline whose deduplication logic silently diverges from the input's
    actual duplicate structure.
    """
    failures: list[str] = []

    if 'id' not in input_df.columns or 'id' not in output_df.columns:
        failures.append('[input-output] Cannot correlate: "id" column missing on one side.')
        return failures

    input_deduped = _input_dedup(input_df)
    expected_rows = len(input_deduped)
    actual_rows = len(output_df)
    if actual_rows != expected_rows:
        failures.append(
            f'[input-dedup] Output has {actual_rows} row(s); input de-duplicates to '
            f'{expected_rows} row(s). Pipeline either dropped rows or failed to dedupe.'
        )

    input_ids = set(pd.to_numeric(input_deduped['id'], errors='coerce').dropna().astype(int))
    output_ids = set(pd.to_numeric(output_df['id'], errors='coerce').dropna().astype(int))

    missing_from_output = input_ids - output_ids
    if missing_from_output:
        failures.append(
            f'[input-coverage] {len(missing_from_output)} input id(s) missing from output: '
            f'{sorted(missing_from_output)}'
        )

    fabricated = output_ids - input_ids
    if fabricated:
        failures.append(
            f'[input-no-fabrication] {len(fabricated)} output id(s) not present in input: '
            f'{sorted(fabricated)}'
        )

    if 'email' in input_df.columns and 'email' in output_df.columns:
        input_emails = {_normalize_email(e) for e in input_deduped['email']}
        output_emails = {_normalize_email(e) for e in output_df['email']}
        dropped_emails = input_emails - output_emails
        if dropped_emails:
            failures.append(
                f'[input-email-match] {len(dropped_emails)} email(s) present in input but '
                f'missing from output (after normalization): {sorted(dropped_emails)}'
            )

    return failures


def run_validation(output_path: str, input_path: str | None = None) -> list[str]:
    """Run every assertion. Returns failure messages; empty list means all passed."""
    failures: list[str] = []

    try:
        output_df = pd.read_csv(output_path, encoding='utf-8-sig')
    except Exception as exc:
        return [f'[load] Cannot read output CSV "{output_path}": {exc}']

    failures.extend(_run_output_only_checks(output_df))

    if input_path is not None:
        try:
            input_df = pd.read_csv(input_path, encoding='utf-8-sig')
        except Exception as exc:
            failures.append(f'[load] Cannot read input CSV "{input_path}": {exc}')
            return failures
        failures.extend(_run_input_output_checks(input_df, output_df))

    return failures


def main() -> None:
    parser = argparse.ArgumentParser(description='Validate Rhombus AI pipeline output CSV.')
    parser.add_argument('--output', required=True, help='Path to the output CSV file.')
    parser.add_argument(
        '--input',
        default=None,
        help='Path to the input CSV (optional; enables input-vs-output correlation checks).',
    )
    args = parser.parse_args()

    failures = run_validation(args.output, args.input)

    if failures:
        print(f'\nValidation FAILED - {len(failures)} issue(s):\n')
        for i, msg in enumerate(failures, 1):
            print(f'  [{i}] {msg}\n')
        sys.exit(1)
    else:
        print('All validation assertions passed.')
        sys.exit(0)


if __name__ == '__main__':
    main()
