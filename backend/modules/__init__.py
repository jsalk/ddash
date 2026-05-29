"""
Module registry — decorator-based registration pattern.

Usage:
    from backend.modules import registry, Module

    @registry.register("cpu", "CPU", "fa-microchip", "system")
    def collect_cpu() -> dict:
        ...
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Module:
    """Immutable module definition."""
    id: str
    title: str
    icon: str
    category: str
    collect: Callable[[], dict | None]


class Registry:
    """Central registry for monitoring modules."""

    def __init__(self):
        self._modules: dict[str, Module] = {}

    def register(self, id: str, title: str, icon: str, category: str):
        """Decorator to register a data collector."""
        def decorator(func: Callable[[], dict]):
            self._modules[id] = Module(
                id=id, title=title, icon=icon, category=category, collect=func,
            )
            return func
        return decorator

    def get(self, id: str) -> Module | None:
        return self._modules.get(id)

    def all(self) -> dict[str, Module]:
        return dict(self._modules)

    def list_meta(self) -> list[dict]:
        """Return module metadata (no collector references)."""
        return [
            {"id": m.id, "title": m.title, "icon": m.icon, "category": m.category}
            for m in self._modules.values()
        ]

    def collect(self, id: str) -> dict | None:
        """Collect data for a single module."""
        mod = self._modules.get(id)
        if mod is None:
            raise KeyError(f"Module '{id}' not found")
        return mod.collect()

    def collect_all(self) -> dict[str, dict]:
        """Collect data for all modules, returning None on failure."""
        results = {}
        for mid, mod in self._modules.items():
            try:
                results[mid] = mod.collect()
            except Exception:
                results[mid] = None
        return results


# Global registry instance
registry = Registry()
