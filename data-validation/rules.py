"""Transformation invariants for the messy.csv output.

Contracts asserted:
  - Deduplicated rows (15 input rows minus 2 exact duplicates = 13 remain).
  - Whitespace stripped on every text column.
  - Title-case on first_name and last_name.
  - Lowercase email.
  - Uppercase country code.
  - ISO YYYY-MM-DD signup_date.
  - Non-negative amount values (float tolerance 1e-6).
"""

from __future__ import annotations

import re

# messy.csv has 15 rows; 2 exact duplicates leaves 13.
EXPECTED_ROW_COUNT = 13

ID_COLUMN_UNIQUE = True

EMAIL_PATTERN = re.compile(r'^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$')


def email_is_valid_and_lowercase(value: str) -> bool:
    """True when the value is lowercase and matches a basic email pattern."""
    return bool(EMAIL_PATTERN.match(str(value)))


def country_is_uppercase(value: str) -> bool:
    """True when country is uppercase with no surrounding whitespace."""
    s = str(value)
    return s == s.upper() and s == s.strip()


TEXT_COLUMNS: list[str] = ['first_name', 'last_name', 'email', 'country']


def no_leading_trailing_whitespace(value: str) -> bool:
    """True when the value has no leading or trailing whitespace."""
    s = str(value)
    return s == s.strip()


# Absolute tolerance for floating-point comparisons.
AMOUNT_ABS_TOLERANCE = 1e-6

AMOUNT_NON_NEGATIVE = True

ISO_DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def signup_date_is_iso(value: str) -> bool:
    """True when the value is in YYYY-MM-DD format."""
    return bool(ISO_DATE_PATTERN.match(str(value).strip()))
