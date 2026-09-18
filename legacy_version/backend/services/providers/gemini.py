from google import genai
from backend.services.providers.base import BaseProvider


class GeminiProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "gemini"

    async def complete(self, prompt: str) -> str:
        client = genai.Client(api_key=self.api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        return response.text
