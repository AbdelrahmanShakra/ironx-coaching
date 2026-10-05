const SUPABASE_URL =
process.env.SUPABASE_URL ||
"https://uibzmqioeumuhczljolu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
process.env.SUPABASE_PUBLISHABLE_KEY || "";

const GEMINI_API_KEY =
process.env.GEMINI_API_KEY || "";

const GEMINI_MODEL =
process.env.GEMINI_MODEL || "gemini-3.8-flash";

const rateLimits = new Map();

function send(res, status, body) {
return res.status(status).json(body);
}

function allowed(userId) {
const now = Date.now();

const old =
rateLimits.get(userId) || {
time: now,
count: 0
};

if (now - old.time > 60000) {
old.time = now;
old.count = 0;
}

old.count++;

rateLimits.set(userId, old);

return old.count <= 15;
}

async function getUser(token) {
if (!token || !SUPABASE_PUBLISHABLE_KEY) {
return null;
}

const response = await fetch(
"${SUPABASE_URL}/auth/v1/user",
{
headers: {
apikey: SUPABASE_PUBLISHABLE_KEY,
Authorization: "Bearer ${token}"
}
}
);

if (!response.ok) {
return null;
}

return response.json();
}

function buildHistory(history) {
if (!Array.isArray(history)) {
return [];
}

return history
.filter(item =>
item &&
typeof item.content === "string" &&
(item.role === "user" || item.role === "assistant")
)
.slice(-24)
.map(item => ({
role:
item.role === "assistant"
? "model"
: "user",
parts: [
{
text: item.content.slice(0, 4000)
}
]
}));
}

function cleanPlan(plan) {
if (!plan || typeof plan !== "object") {
return null;
}

return {
id: plan.id || null,
title: plan.title || "",
description: plan.description || "",
calories:
plan.calories ??
plan.daily_calories ??
null,
protein:
plan.protein ??
plan.protein_g ??
null,
carbs:
plan.carbs ??
plan.carbs_g ??
null,
fats:
plan.fats ??
plan.fats_g ??
null,
meals_per_day:
plan.meals_per_day ??
null,
water_liters:
plan.water_liters ??
null,
goal:
plan.goal ||
"",
notes:
plan.notes ||
"",
meals:
Array.isArray(plan.meals)
? plan.meals.slice(0, 20).map(meal => ({
meal_number:
meal.meal_number ??
null,
name:
meal.name ||
"",
time:
meal.time ||
"",
foods:
meal.foods ||
"",
calories:
meal.calories ??
null,
protein_g:
meal.protein_g ??
null,
carbs_g:
meal.carbs_g ??
null,
fat_g:
meal.fat_g ??
null,
fiber_g:
meal.fiber_g ??
null,
notes:
meal.notes ||
""
}))
: []
};
}

function cleanTrainingPlan(plan) {
if (!plan || typeof plan !== "object") {
return null;
}

return {
id:
plan.id ||
null,

title:
  plan.title ||
  "",

description:
  plan.description ||
  "",

workouts:
  Array.isArray(plan.workouts)
    ? plan.workouts.slice(0, 100).map(workout => ({
        day_number:
          workout.day_number ??
          null,

        exercise:
          workout.exercise ||
          "",

        sets:
          workout.sets ||
          "",

        reps:
          workout.reps ||
          "",

        rest:
          workout.rest ||
          "",

        notes:
          workout.notes ||
          ""
      }))
    : []

};
}

module.exports = async function handler(req, res) {

if (req.method !== "POST") {
return send(res, 405, {
error: "METHOD_NOT_ALLOWED"
});
}

if (!GEMINI_API_KEY) {

console.error(
  "GEMINI_API_KEY is missing from the server environment."
);

return send(res, 503, {
  error: "AI_NOT_CONFIGURED"
});

}

try {

const auth =
  req.headers.authorization || "";

const token =
  auth.startsWith("Bearer ")
    ? auth.substring(7)
    : "";


const user =
  await getUser(token);


if (!user?.id) {

  return send(res, 401, {
    error: "UNAUTHORIZED"
  });
}


if (!allowed(user.id)) {

  return send(res, 429, {
    error: "RATE_LIMITED"
  });
}


const body =
  req.body || {};


const message =
  typeof body.message === "string"
    ? body.message.trim()
    : "";


if (!message) {

  return send(res, 400, {
    error: "MESSAGE_REQUIRED"
  });
}


if (message.length > 4000) {

  return send(res, 400, {
    error: "MESSAGE_TOO_LONG"
  });
}


const profile =
  body.profile || {};

const language =
  body.language || "en";

const history =
  buildHistory(body.history);

const nutritionPlan =
  cleanPlan(body.nutritionPlan);

const trainingPlan =
  cleanTrainingPlan(body.trainingPlan);


const systemInstruction = `

You are IRONX AI Coach.

You are an AI fitness assistant for the IRONX coaching platform.

Help users with:

- workout planning
- exercise technique
- training progression
- nutrition
- calories and macros
- recovery
- sleep
- general fitness questions

Give practical, clear, concise answers.

IMPORTANT:

You have access to the user's current IRONX profile,
training plan, and nutrition plan when provided.

Use those plans as the primary context when answering
questions about the user's current training or nutrition.

Do NOT invent exercises, meals, calories, macros,
or plan details that are not present in the supplied data.

If the user asks about something not contained
in the current plan, give general fitness guidance
and clearly distinguish it from their actual IRONX plan.

Do not diagnose medical conditions.
Do not pretend to be a doctor.
Do not replace a qualified medical professional.

If the user reports serious pain,
significant injury,
chest pain,
fainting,
severe dizziness,
difficulty breathing,
or another dangerous symptom,
recommend professional medical care.

Never pretend to be a human coach.
Always be honest that you are an AI assistant.

Answer in the user's requested language.

User language:
${language}

User profile:
${JSON.stringify(profile)}

Current IRONX training plan:
${JSON.stringify(trainingPlan)}

Current IRONX nutrition plan:
${JSON.stringify(nutritionPlan)}
`;

const contents = [
  ...history,

  {
    role: "user",
    parts: [
      {
        text: message
      }
    ]
  }
];


const apiUrl =
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;


console.log("Gemini request:", {
  model: GEMINI_MODEL,
  historyLength:
    history.length,
  messageLength:
    message.length,
  hasTrainingPlan:
    !!trainingPlan,
  hasNutritionPlan:
    !!nutritionPlan
});


const aiResponse =
  await fetch(
    apiUrl,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
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

        contents,

        generationConfig: {
          maxOutputTokens: 700
        }

      })
    }
  );


const data =
  await aiResponse.json();


if (!aiResponse.ok) {

  console.error(
    "Gemini Error:",
    JSON.stringify(
      data,
      null,
      2
    )
  );


  return send(res, 502, {
    error:
      "AI_PROVIDER_ERROR",

    details:
      data?.error?.message ||
      "Gemini rejected the request.",

    status:
      data?.error?.status ||
      "UNKNOWN",

    code:
      data?.error?.code ||
      aiResponse.status
  });
}


const reply =
  data?.candidates?.[0]?.content?.parts
    ?.map(
      part =>
        part?.text ||
        ""
    )
    .join("")
    .trim();


if (!reply) {

  console.error(
    "Gemini returned no usable response:",
    JSON.stringify(
      data,
      null,
      2
    )
  );


  return send(res, 502, {
    error:
      "AI_EMPTY_RESPONSE",

    details:
      "Gemini returned no usable response."
  });
}


return send(res, 200, {
  reply
});

} catch (error) {

console.error(
  "AI SERVER ERROR:",
  error
);


return send(res, 500, {
  error:
    "AI_SERVER_ERROR",

  details:
    error?.message ||
    "Unknown server error."
});

}

};
