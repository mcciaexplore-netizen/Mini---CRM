from groq import Groq
from backend.services.providers.base import BaseProvider


class GroqProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "groq"

    async def complete(self, prompt: str) -> str:
        client = Groq(api_key=self.api_key)
        chat = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        return chat.choices[0].message.content
