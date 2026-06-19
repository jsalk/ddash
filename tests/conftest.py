import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

def pytest_configure(config):
    config.addinivalue_line("markers", "anyio: mark test as async")

# Force asyncio backend — trio can't run asyncio.to_thread()
pytest_plugins = ("anyio",)

@pytest.fixture(params=["asyncio"])
def anyio_backend(request):
    return request.param
