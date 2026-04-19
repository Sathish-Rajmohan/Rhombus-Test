"""Output schema for the messy.csv pipeline.

The column order and dtype coercion contract is checked here; value-level
invariants (casing, whitespace, email format, ...) live in rules.py.
"""

EXPECTED_COLUMNS: list[str] = [
    'id',
    'first_name',
    'last_name',
    'email',
    'signup_date',
    'amount',
    'country',
]

# Pandas dtype names for coercion checks. id is coerced to int64, amount to
# float64; signup_date stays object and its format is checked in rules.py.
COLUMN_DTYPES: dict[str, str] = {
    'id': 'int64',
    'first_name': 'object',
    'last_name': 'object',
    'email': 'object',
    'signup_date': 'object',
    'amount': 'float64',
    'country': 'object',
}

NOT_NULL_COLUMNS: list[str] = [
    'id',
    'first_name',
    'last_name',
    'email',
    'signup_date',
    'amount',
    'country',
]
