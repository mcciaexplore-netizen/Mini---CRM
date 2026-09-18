from mistralai import Mistral
from backend.services.providers.base import BaseProvider


class MistralProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "mistral"

    async def complete(self, prompt: str) -> str:
        client = Mistral(api_key=self.api_key)
        response = client.chat.complete(
            model="mistral-small-latest",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
