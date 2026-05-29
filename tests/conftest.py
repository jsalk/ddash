import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

def pytest_configure(config):
    config.addinivalue_line("markers", "anyio: mark test as async")
