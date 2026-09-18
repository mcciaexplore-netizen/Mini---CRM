import cohere
from backend.services.providers.base import BaseProvider


class CohereProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "cohere"

    async def complete(self, prompt: str) -> str:
        client = cohere.Client(api_key=self.api_key)
        response = client.chat(
            model="command-r-plus",
            message=prompt,
        )
        return response.text
