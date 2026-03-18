"""Business rules: duplicate inventory, assignment preconditions (integration-style)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.mark.skip(reason="Requires running DB and seeded admin; enable in CI with test database")
def test_cannot_create_duplicate_inventory_number():
    # Login, POST two assets same numero_inventario -> second 400
    pass


@pytest.mark.skip(reason="Requires running DB")
def test_cannot_assign_without_stock():
    pass


@pytest.mark.skip(reason="Requires running DB")
def test_cannot_double_assign_same_asset():
    pass
