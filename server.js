const response =
  await fetch(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                systemInstruction
            }
          ]
        },

        contents: [
          {
            role: "user",

            parts: [
              {
                text:
                  userPrompt
              }
            ]
          }
        ],

        generationConfig: {
          maxOutputTokens: 5000,
          responseMimeType:
            "application/json"
        }
      })
    }
  );

const data =
  await response.json();

if (!response.ok) {
  console.error(
    "Gemini onboarding error:",
    data
  );

  return res.status(502).json({
    error:
      "AI_PROVIDER_ERROR",

    details:
      data?.error?.message ||
      "Gemini request failed."
  });
}
