"""Pytest wrapper around validate_output.run_validation.

One positive test asserts the committed oracle passes clean. Five negative
mutation tests prove each rule catches a real regression (duplicate rows,
uppercase email, lowercase country, wrong column names, negative amount).
"""

from __future__ import annotations

import csv
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from validate_output import run_validation

EXPECTED_CSV = pathlib.Path(__file__).parent.parent.parent / 'fixtures' / 'output' / 'expected.csv'
MESSY_CSV = pathlib.Path(__file__).parent.parent.parent / 'fixtures' / 'input' / 'messy.csv'


def _write_csv(rows: list[dict[str, str]], tmp_dir: str) -> str:
    """Write rows to a temp CSV and return the path."""
    p = pathlib.Path(tmp_dir) / 'test_output.csv'
    with open(p, 'w', newline='', encoding='utf-8') as f:
        if rows:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
    return str(p)


BASE_ROW: dict[str, str] = {
    'id': '1',
    'first_name': 'Alice',
    'last_name': 'Smith',
    'email': 'alice@example.com',
    'signup_date': '2024-01-05',
    'amount': '120.5',
    'country': 'US',
}


def _make_rows(count: int = 13, overrides: dict[str, str] | None = None) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for i in range(count):
        row = {**BASE_ROW, 'id': str(i + 1), 'email': f'user{i + 1}@example.com'}
        if overrides:
            row.update(overrides)
        rows.append(row)
    return rows


def test_valid_expected_csv_passes() -> None:
    """The committed expected.csv must pass all assertions with zero failures."""
    assert EXPECTED_CSV.exists(), f'expected.csv not found at {EXPECTED_CSV}'
    failures = run_validation(str(EXPECTED_CSV))
    assert failures == [], 'expected.csv failed validation:\n' + '\n'.join(failures)


def test_input_output_correlation_passes() -> None:
    """Running with both --input messy.csv and --output expected.csv must pass."""
    assert MESSY_CSV.exists(), f'messy.csv not found at {MESSY_CSV}'
    assert EXPECTED_CSV.exists(), f'expected.csv not found at {EXPECTED_CSV}'
    failures = run_validation(str(EXPECTED_CSV), str(MESSY_CSV))
    assert failures == [], 'input/output correlation failed:\n' + '\n'.join(failures)


def test_fabricated_output_id_fails_correlation() -> None:
    """If the output contains an id not present in input, correlation must fail."""
    with tempfile.TemporaryDirectory() as tmp:
        rows = _make_rows(13)
        rows[-1]['id'] = '999'
        path = _write_csv(rows, tmp)
        failures = run_validation(path, str(MESSY_CSV))
    assert any('[input-no-fabrication]' in f for f in failures), (
        'Expected [input-no-fabrication] failure, got: ' + str(failures)
    )


def test_missing_output_id_fails_correlation() -> None:
    """If an input id is absent from output, correlation must fail."""
    with tempfile.TemporaryDirectory() as tmp:
        rows = _make_rows(12)
        path = _write_csv(rows, tmp)
        failures = run_validation(path, str(MESSY_CSV))
    assert any('[input-dedup]' in f or '[input-coverage]' in f for f in failures), (
        'Expected [input-dedup] or [input-coverage] failure, got: ' + str(failures)
    )


def test_duplicate_rows_fail() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        rows = _make_rows(13)
        rows.append({**BASE_ROW, 'id': '1', 'email': 'user1@example.com'})
        path = _write_csv(rows, tmp)
        failures = run_validation(path)
    assert any(
        'row-count' in f or 'id-unique' in f or 'duplicate-rows' in f for f in failures
    ), 'Expected row-count/id-unique/duplicate-rows failure, got: ' + str(failures)


def test_uppercase_email_fails() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        rows = _make_rows(13, overrides={'email': 'ALICE@EXAMPLE.COM'})
        path = _write_csv(rows, tmp)
        failures = run_validation(path)
    assert any('[email]' in f for f in failures), (
        'Expected [email] failure for uppercase email, got: ' + str(failures)
    )


def test_lowercase_country_fails() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        rows = _make_rows(13, overrides={'country': 'us'})
        path = _write_csv(rows, tmp)
        failures = run_validation(path)
    assert any('[country]' in f for f in failures), (
        'Expected [country] failure for lowercase country, got: ' + str(failures)
    )


def test_wrong_column_names_fail() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        bad_rows: list[dict[str, str]] = [{'col_a': '1', 'col_b': 'foo'}]
        path = _write_csv(bad_rows, tmp)
        failures = run_validation(path)
    assert any('[columns]' in f for f in failures), (
        'Expected [columns] failure for wrong column names, got: ' + str(failures)
    )


def test_negative_amount_fails() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        rows = _make_rows(13, overrides={'amount': '-5.0'})
        path = _write_csv(rows, tmp)
        failures = run_validation(path)
    assert any('[amount]' in f for f in failures), (
        'Expected [amount] failure for negative amount, got: ' + str(failures)
    )
