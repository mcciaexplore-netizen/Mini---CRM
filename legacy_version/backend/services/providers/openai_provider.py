from openai import OpenAI
from backend.services.providers.base import BaseProvider


class OpenAIProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "openai"

    async def complete(self, prompt: str) -> str:
        client = OpenAI(api_key=self.api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
