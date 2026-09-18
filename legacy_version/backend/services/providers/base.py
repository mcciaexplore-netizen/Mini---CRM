from abc import ABC, abstractmethod


class BaseProvider(ABC):
    def __init__(self, api_key: str):
        self.api_key = api_key

    @abstractmethod
    async def complete(self, prompt: str) -> str:
        """Send prompt and return text response."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass
