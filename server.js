const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "150kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(express.static(__dirname));

/* =========================================================
   HEALTH
   ========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "IRONX Coaching server is running"
  });
});

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cleanText(value, max = 5000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

/* =========================================================
   PROFILE NORMALIZATION
   ========================================================= */

function normalizeProfile(profile = {}) {
  return {
    age: number(
      profile.age ??
      profile.years
    ),

    weight: number(
      profile.weight ??
      profile.weightKg ??
      profile.weight_kg
    ),

    height: number(
      profile.height ??
      profile.heightCm ??
      profile.height_cm
    ),

    waist: number(
      profile.waist ??
      profile.waistCm ??
      profile.waist_cm
    ),

    neck: number(
      profile.neck ??
      profile.neckCm ??
      profile.neck_cm
    ),

    hip: number(
      profile.hip ??
      profile.hipCm ??
      profile.hip_cm
    ),

    gender: String(
      profile.gender ??
      profile.sex ??
      ""
    ).toLowerCase(),

    activity: String(
      profile.activityLevel ??
      profile.activity_level ??
      profile.activity ??
      "moderate"
    ).toLowerCase(),

    goal: String(
      profile.goal ??
      "maintain"
    ).toLowerCase(),

    steps: number(
      profile.steps ??
      profile.dailySteps ??
      profile.steps_per_day ??
      profile.averageDailySteps
    ),

    trainingDays: number(
      profile.trainingDays ??
      profile.training_days_per_week ??
      profile.trainingDaysPerWeek ??
      profile.daysPerWeek
    ),

    trainingExperience: String(
      profile.trainingExperience ??
      profile.training_experience ??
      profile.experience ??
      ""
    ),

    injuries: String(
      profile.injuries ??
      profile.problems ??
      ""
    ),

    medications: String(
      profile.medications ??
      ""
    ),

    allergies: String(
      profile.foodAllergyDetails ??
      profile.allergyDetails ??
      profile.allergies ??
      ""
    ),

    work: String(
      profile.work ??
      profile.works ??
      ""
    ).toLowerCase(),

    sleep: number(
      profile.sleepHours ??
      profile.sleep_hours ??
      profile.sleep
    ),

    foodPreferences: String(
      profile.foodPreferences ??
      profile.food_preferences ??
      profile.preferences ??
      profile.availableFoods ??
      ""
    ),

    budget: String(
      profile.budget ??
      ""
    ),

    medicalNotes: String(
      profile.medicalNotes ??
      profile.medical_notes ??
      ""
    )
  };
}

/* =========================================================
   NUTRITION CALCULATIONS
   ========================================================= */

function calculateBMR(profile) {
  const p = normalizeProfile(profile);

  if (!p.weight || !p.height || !p.age) {
    return null;
  }

  const base =
    (10 * p.weight) +
    (6.25 * p.height) -
    (5 * p.age);

  if (
    p.gender === "male" ||
    p.gender === "m" ||
    p.gender === "ذكر"
  ) {
    return Math.round(base + 5);
  }

  if (
    p.gender === "female" ||
    p.gender === "f" ||
    p.gender === "أنثى" ||
    p.gender === "انثى"
  ) {
    return Math.round(base - 161);
  }

  return Math.round(base - 78);
}

function activityMultiplier(activity) {
  const a = String(activity || "").toLowerCase();

  if (
    a.includes("sedentary") ||
    a.includes("خامل") ||
    a.includes("قليل") ||
    a === "1.2"
  ) {
    return 1.2;
  }

  if (
    a.includes("light") ||
    a.includes("خفيف") ||
    a === "1.375"
  ) {
    return 1.375;
  }

  if (
    a.includes("moderate") ||
    a.includes("متوسط") ||
    a === "1.55"
  ) {
    return 1.55;
  }

  if (
    a.includes("very") ||
    a.includes("high") ||
    a.includes("عالي") ||
    a === "1.725"
  ) {
    return 1.725;
  }

  if (
    a.includes("extra") ||
    a.includes("extreme") ||
    a.includes("شديد") ||
    a === "1.9"
  ) {
    return 1.9;
  }

  return 1.55;
}

function calculateMaintenance(profile) {
  const bmr = calculateBMR(profile);

  if (!bmr) {
    return null;
  }

  const p = normalizeProfile(profile);

  return Math.round(
    bmr * activityMultiplier(p.activity)
  );
}

function calculateTargetCalories(profile) {
  const maintenance = calculateMaintenance(profile);

  if (!maintenance) {
    return null;
  }

  const p = normalizeProfile(profile);

  let calories = maintenance;

  if (
    p.goal.includes("cut") ||
    p.goal.includes("loss") ||
    p.goal.includes("lose") ||
    p.goal.includes("خس") ||
    p.goal.includes("تنشيف")
  ) {
    calories = maintenance * 0.85;
  }

  else if (
    p.goal.includes("bulk") ||
    p.goal.includes("gain") ||
    p.goal.includes("ضخ") ||
    p.goal.includes("تضخيم")
  ) {
    calories = maintenance * 1.10;
  }

  return Math.round(calories);
}

function calculateMacros(profile) {
  const p = normalizeProfile(profile);
  const calories = calculateTargetCalories(profile);

  if (!p.weight || !calories) {
    return null;
  }

  let protein = p.weight * 1.8;
  let fat = p.weight * 0.8;

  protein = clamp(
    protein,
    1.6 * p.weight,
    2.2 * p.weight
  );

  fat = clamp(
    fat,
    0.6 * p.weight,
    1.0 * p.weight
  );

  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;

  let carbs =
    (calories - proteinCalories - fatCalories) / 4;

  if (carbs < 0) {
    carbs = 0;
  }

  return {
    calories: Math.round(calories),
    protein_g: round(protein),
    carbs_g: round(carbs),
    fat_g: round(fat)
  };
}

function calculateBMI(profile) {
  const p = normalizeProfile(profile);

  if (!p.weight || !p.height) {
    return null;
  }

  const heightMeters = p.height / 100;

  if (!heightMeters) {
    return null;
  }

  return round(
    p.weight /
    (heightMeters * heightMeters),
    1
  );
}

function calculateBodyFat(profile) {
  const p = normalizeProfile(profile);

  if (!p.height || !p.waist || !p.neck) {
    return null;
  }

  const isMale =
    p.gender === "male" ||
    p.gender === "m" ||
    p.gender === "ذكر";

  const isFemale =
    p.gender === "female" ||
    p.gender === "f" ||
    p.gender === "أنثى" ||
    p.gender === "انثى";

  if (isMale) {
    if (p.waist <= p.neck) {
      return null;
    }

    const bodyFat =
      495 /
      (
        1.0324 -
        0.19077 *
        Math.log10(p.waist - p.neck) +
        0.15456 *
        Math.log10(p.height)
      ) -
      450;

    return clamp(
      round(bodyFat, 1),
      2,
      60
    );
  }

  if (isFemale) {
    if (
      !p.hip ||
      p.waist + p.hip <= p.neck
    ) {
      return null;
    }

    const bodyFat =
      495 /
      (
        1.29579 -
        0.35004 *
        Math.log10(
          p.waist + p.hip - p.neck
        ) +
        0.22100 *
        Math.log10(p.height)
      ) -
      450;

    return clamp(
      round(bodyFat, 1),
      5,
      70
    );
  }

  return null;
}

function getNutritionCalculations(profile) {
  return {
    bmr: calculateBMR(profile),

    maintenance_calories:
      calculateMaintenance(profile),

    target_calories:
      calculateTargetCalories(profile),

    macros:
      calculateMacros(profile),

    bmi:
      calculateBMI(profile),

    estimated_body_fat_percent:
      calculateBodyFat(profile)
  };
}

/* =========================================================
   PROFILE NUTRITION API
   ========================================================= */

app.post(
  "/api/nutrition/profile",
  (req, res) => {
    try {
      const profile =
        req.body?.profile ||
        req.body ||
        {};

      const calculations =
        getNutritionCalculations(profile);

      return res.json({
        ok: true,
        calculations
      });

    } catch (error) {
      console.error(
        "Profile nutrition calculation error:",
        error
      );

      return res.status(500).json({
        error:
          "NUTRITION_CALCULATION_ERROR"
      });
    }
  }
);

/* =========================================================
   USDA FOOD SEARCH
   ========================================================= */

app.get(
  "/api/nutrition/search",
  async (req, res) => {
    try {
      const query =
        String(
          req.query.q || ""
        ).trim();

      if (
        !query ||
        query.length > 100
      ) {
        return res.status(400).json({
          error:
            "INVALID_FOOD_QUERY"
        });
      }

      const apiKey =
        process.env.USDA_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          error:
            "USDA_NOT_CONFIGURED"
        });
      }

      const pageSize =
        Math.min(
          Math.max(
            number(
              req.query.limit,
              10
            ),
            1
          ),
          25
        );

      const url =
        "https://api.nal.usda.gov/fdc/v1/foods/search" +
        `?api_key=${encodeURIComponent(apiKey)}` +
        `&query=${encodeURIComponent(query)}` +
        `&pageSize=${pageSize}` +
        "&dataType=Foundation,SR%20Legacy";

      const response =
        await fetch(url);

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "USDA API error:",
          data
        );

        return res.status(502).json({
          error:
            "USDA_PROVIDER_ERROR"
        });
      }

      const foods =
        Array.isArray(data.foods)
          ? data.foods.map(food => {
              const nutrients = {};

              for (
                const n
                of food.foodNutrients || []
              ) {
                const id =
                  Number(
                    n.nutrientId
                  );

                if (id === 1008) {
                  nutrients.calories =
                    number(n.value);
                }

                if (id === 1003) {
                  nutrients.protein =
                    number(n.value);
                }

                if (id === 1005) {
                  nutrients.carbs =
                    number(n.value);
                }

                if (id === 1004) {
                  nutrients.fat =
                    number(n.value);
                }

                if (id === 1079) {
                  nutrients.fiber =
                    number(n.value);
                }
              }

              return {
                fdcId:
                  food.fdcId,

                name:
                  food.description,

                dataType:
                  food.dataType,

                nutrientsPer100g: {
                  calories:
                    round(
                      nutrients.calories ||
                      0
                    ),

                  protein:
                    round(
                      nutrients.protein ||
                      0
                    ),

                  carbs:
                    round(
                      nutrients.carbs ||
                      0
                    ),

                  fat:
                    round(
                      nutrients.fat ||
                      0
                    ),

                  fiber:
                    round(
                      nutrients.fiber ||
                      0
                    )
                }
              };
            })
          : [];

      return res.json({
        ok: true,
        foods
      });

    } catch (error) {
      console.error(
        "USDA search error:",
        error
      );

      return res.status(500).json({
        error:
          "USDA_SEARCH_ERROR"
      });
    }
  }
);

/* =========================================================
   FOOD / MEAL CALCULATOR
   ========================================================= */

app.post(
  "/api/nutrition/calculate",
  (req, res) => {
    try {
      const items =
        Array.isArray(
          req.body?.items
        )
          ? req.body.items
          : [];

      if (!items.length) {
        return res.status(400).json({
          error:
            "NO_FOOD_ITEMS"
        });
      }

      if (items.length > 100) {
        return res.status(400).json({
          error:
            "TOO_MANY_FOOD_ITEMS"
        });
      }

      const totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
      };

      const calculatedItems = [];

      for (const item of items) {
        const grams =
          number(
            item?.grams
          );

        if (
          !item ||
          !grams ||
          grams <= 0
        ) {
          continue;
        }

        const per100g =
          item.per100g || {};

        const calories =
          number(
            per100g.calories
          );

        const protein =
          number(
            per100g.protein
          );

        const carbs =
          number(
            per100g.carbs
          );

        const fat =
          number(
            per100g.fat
          );

        const fiber =
          number(
            per100g.fiber
          );

        const multiplier =
          grams / 100;

        const calculated = {
          name:
            String(
              item.name ||
              "Food"
            ),

          grams:
            round(grams),

          calories:
            round(
              calories *
              multiplier
            ),

          protein:
            round(
              protein *
              multiplier
            ),

          carbs:
            round(
              carbs *
              multiplier
            ),

          fat:
            round(
              fat *
              multiplier
            ),

          fiber:
            round(
              fiber *
              multiplier
            )
        };

        totals.calories +=
          calculated.calories;

        totals.protein +=
          calculated.protein;

        totals.carbs +=
          calculated.carbs;

        totals.fat +=
          calculated.fat;

        totals.fiber +=
          calculated.fiber;

        calculatedItems.push(
          calculated
        );
      }

      return res.json({
        ok: true,

        items:
          calculatedItems,

        totals: {
          calories:
            round(
              totals.calories
            ),

          protein:
            round(
              totals.protein
            ),

          carbs:
            round(
              totals.carbs
            ),

          fat:
            round(
              totals.fat
            ),

          fiber:
            round(
              totals.fiber
            )
        }
      });

    } catch (error) {
      console.error(
        "Meal calculation error:",
        error
      );

      return res.status(500).json({
        error:
          "MEAL_CALCULATION_ERROR"
      });
    }
  }
);

/* =========================================================
   GEMINI HELPERS
   ========================================================= */

function extractJson(text) {
  if (!text) {
    return null;
  }

  let value =
    String(text).trim();

  value =
    value
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  try {
    return JSON.parse(value);
  } catch (_) {}

  const first =
    value.indexOf("{");

  const last =
    value.lastIndexOf("}");

  if (
    first !== -1 &&
    last !== -1 &&
    last > first
  ) {
    try {
      return JSON.parse(
        value.slice(
          first,
          last + 1
        )
      );
    } catch (_) {}
  }

  return null;
}

function normalizeGoal(goal) {
  const g =
    String(
      goal || "maintain"
    ).toLowerCase();

  if (
    g.includes("cut") ||
    g.includes("loss") ||
    g.includes("lose") ||
    g.includes("تنشيف") ||
    g.includes("خس")
  ) {
    return "cut";
  }

  if (
    g.includes("bulk") ||
    g.includes("gain") ||
    g.includes("ضخ") ||
    g.includes("تضخيم")
  ) {
    return "bulk";
  }

  return "maintain";
}

function normalizeTrainingDays(value) {
  const days =
    Math.round(
      number(value, 4)
    );

  return clamp(
    days || 4,
    1,
    7
  );
}

/* =========================================================
   AUTO PLAN GENERATOR
   ========================================================= */

app.post(
  "/api/onboarding/generate-plan",
  async (req, res) => {
    try {
      const profile =
        req.body?.profile ||
        req.body ||
        {};

      const p =
        normalizeProfile(
          profile
        );

      if (
        !p.age ||
        !p.weight ||
        !p.height
      ) {
        return res.status(400).json({
          error:
            "INCOMPLETE_PROFILE",
          message:
            "Age, weight and height are required."
        });
      }

      const calculations =
        getNutritionCalculations(
          profile
        );

      const targetCalories =
        calculations.target_calories;

      const macros =
        calculations.macros;

      if (
        !targetCalories ||
        !macros
      ) {
        return res.status(400).json({
          error:
            "CALCULATION_FAILED"
        });
      }

      const apiKey =
        process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          error:
            "AI_NOT_CONFIGURED"
        });
      }

      const model =
        process.env.GEMINI_MODEL ||
        "gemini-3.8-flash";

      const language =
        String(
          req.body?.language ||
          "en"
        ).toLowerCase();

      const trainingDays =
        normalizeTrainingDays(
          p.trainingDays
        );

      const goal =
        normalizeGoal(
          p.goal
        );

      const profileForAI = {
        age: p.age,
        gender: p.gender,
        weight_kg: p.weight,
        height_cm: p.height,
        waist_cm: p.waist || null,
        neck_cm: p.neck || null,
        hip_cm: p.hip || null,
        activity: p.activity,
        goal,
        daily_steps: p.steps || 0,
        training_days_per_week:
          trainingDays,
        training_experience:
          p.trainingExperience,
        injuries:
          p.injuries,
        medications:
          p.medications,
        allergies:
          p.allergies,
        work:
          p.work,
        sleep_hours:
          p.sleep,
        food_preferences:
          p.foodPreferences,
        budget:
          p.budget,
        medical_notes:
          p.medicalNotes
      };

      const calculationsForAI = {
        bmr:
          calculations.bmr,

        maintenance_calories:
          calculations.maintenance_calories,

        target_calories:
          targetCalories,

        protein_g:
          macros.protein_g,

        carbs_g:
          macros.carbs_g,

        fat_g:
          macros.fat_g
      };

      const systemInstruction =
        language === "ar"
          ? `
أنت IRONX Plan Generator.

مهمتك إنشاء خطة تدريب وخطة تغذية شخصية لعميل جديد داخل منصة IRONX.

بيانات العميل والحسابات موجودة في الرسالة.

قواعد مهمة:

1. لا تغيّر هدف العميل.
2. السعرات والماكروز المحسوبة بواسطة IRONX هي المرجع الأساسي.
3. لا تخترع سعرات مختلفة عن target_calories.
4. لا تعطِ خطة عامة تصلح للجميع.
5. استخدم عدد أيام التدريب الفعلي.
6. راعِ مستوى الخبرة.
7. راعِ الإصابات والمشاكل المسجلة.
8. لا تقترح تمرينًا قد يزيد إصابة أو مشكلة واضحة.
9. راعِ الحساسية الغذائية.
10. راعِ تفضيلات الطعام والميزانية إن وجدت.
11. لا تستخدم مكملات كشرط أساسي للخطة.
12. الوجبات يجب أن تحتوي على كميات تقريبية واضحة.
13. اجعل إجمالي اليوم قريبًا جدًا من السعرات والماكروز المستهدفة.
14. استخدم أطعمة واقعية وسهلة التحضير.
15. لا تكتب شرحًا خارج JSON.
16. أعد JSON صالحًا فقط.

خطة التدريب يجب أن تحتوي على:
- عنوان
- وصف
- أيام التدريب
- اسم التمرين
- sets
- reps
- rest
- notes

خطة التغذية يجب أن تحتوي على:
- عنوان
- meals_per_day
- water_liters
- notes
- وجبات
- اسم الوجبة
- الوقت
- الأطعمة والكميات
- calories
- protein_g
- carbs_g
- fat_g
- fiber_g
- notes

استخدم اللغة العربية.
`
          : `
You are the IRONX Plan Generator.

Your job is to create a personalized training plan and nutrition plan for a new client.

Important rules:

1. Never change the client's goal.
2. IRONX calculated calories and macros are the primary targets.
3. Do not invent a completely different calorie target.
4. Do not create a generic one-size-fits-all plan.
5. Use the actual number of training days.
6. Respect training experience.
7. Respect injuries and physical problems.
8. Do not recommend exercises that could clearly aggravate a reported injury.
9. Respect food allergies.
10. Respect food preferences and budget when available.
11. Supplements must not be required.
12. Meals must contain practical approximate quantities.
13. Daily nutrition should stay very close to the calculated calorie and macro targets.
14. Use realistic, accessible foods.
15. Return valid JSON only.
16. Do not include explanations outside the JSON.

Training plan must include:
- title
- description
- training days
- exercise
- sets
- reps
- rest
- notes

Nutrition plan must include:
- title
- meals_per_day
- water_liters
- notes
- meals
- meal name
- time
- foods and quantities
- calories
- protein_g
- carbs_g
- fat_g
- fiber_g
- notes

Use English.
`;

      const userPrompt = `
CLIENT PROFILE:

${JSON.stringify(
  profileForAI,
  null,
  2
)}

IRONX CALCULATIONS:

${JSON.stringify(
  calculationsForAI,
  null,
  2
)}

Create a personalized plan.

Return EXACTLY this JSON structure:

{
  "training": {
    "title": "string",
    "description": "string",
    "exercises": [
      {
        "day_number": 1,
        "exercise": "string",
        "sets": "3",
        "reps": "8-12",
        "rest": "90 sec",
        "notes": "string"
      }
    ]
  },
  "nutrition": {
    "title": "string",
    "meals_per_day": 4,
    "water_liters": 2.5,
    "notes": "string",
    "meals": [
      {
        "meal_number": 1,
        "name": "string",
        "time": "08:00",
        "foods": "string",
        "calories": 500,
        "protein_g": 30,
        "carbs_g": 60,
        "fat_g": 15,
        "fiber_g": 8,
        "notes": "string"
      }
    ]
  }
}
`;

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`;

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
  responseMimeType: "application/json"
}
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

      const raw =
        data?.candidates?.[0]
          ?.content?.parts
          ?.map(
            part =>
              part.text || ""
          )
          .join("")
          .trim();

      const generated =
        extractJson(raw);

      if (!generated) {
        console.error(
          "Invalid Gemini JSON:",
          raw
        );

        return res.status(502).json({
          error:
            "AI_INVALID_PLAN"
        });
      }

      /* -----------------------------------------------------
         SANITIZE TRAINING PLAN
         ----------------------------------------------------- */

      const training =
        generated.training || {};

      const trainingExercises =
        Array.isArray(
          training.exercises
        )
          ? training.exercises
              .map(item => ({
                day_number: clamp(
                  Math.round(
                    number(
                      item?.day_number,
                      1
                    )
                  ),
                  1,
                  trainingDays
                ),

                exercise:
                  cleanText(
                    item?.exercise,
                    200
                  ),

                sets:
                  cleanText(
                    item?.sets,
                    50
                  ),

                reps:
                  cleanText(
                    item?.reps,
                    50
                  ),

                rest:
                  cleanText(
                    item?.rest,
                    50
                  ),

                notes:
                  cleanText(
                    item?.notes,
                    500
                  )
              }))
              .filter(
                item =>
                  item.exercise
              )
          : [];

      /* -----------------------------------------------------
         SANITIZE NUTRITION PLAN
         ----------------------------------------------------- */

      const nutrition =
        generated.nutrition ||
        {};

      const meals =
        Array.isArray(
          nutrition.meals
        )
          ? nutrition.meals
              .slice(0, 8)
              .map(
                (meal, index) => ({
                  meal_number:
                    clamp(
                      Math.round(
                        number(
                          meal?.meal_number,
                          index + 1
                        )
                      ),
                      1,
                      8
                    ),

                  name:
                    cleanText(
                      meal?.name ||
                      `Meal ${index + 1}`,
                      150
                    ),

                  time:
                    cleanText(
                      meal?.time,
                      50
                    ),

                  foods:
                    cleanText(
                      meal?.foods,
                      1500
                    ),

                  calories:
                    Math.max(
                      0,
                      Math.round(
                        number(
                          meal?.calories
                        )
                      )
                    ),

                  protein_g:
                    Math.max(
                      0,
                      round(
                        number(
                          meal?.protein_g
                        ),
                        1
                      )
                    ),

                  carbs_g:
                    Math.max(
                      0,
                      round(
                        number(
                          meal?.carbs_g
                        ),
                        1
                      )
                    ),

                  fat_g:
                    Math.max(
                      0,
                      round(
                        number(
                          meal?.fat_g
                        ),
                        1
                      )
                    ),

                  fiber_g:
                    Math.max(
                      0,
                      round(
                        number(
                          meal?.fiber_g
                        ),
                        1
                      )
                    ),

                  notes:
                    cleanText(
                      meal?.notes,
                      500
                    )
                })
              )
              .filter(
                meal =>
                  meal.name ||
                  meal.foods
              )
          : [];

      const mealsPerDay =
        clamp(
          Math.round(
            number(
              nutrition.meals_per_day,
              meals.length || 4
            )
          ),
          1,
          8
        );

      const waterLiters =
        clamp(
          round(
            number(
              nutrition.water_liters,
              2.5
            ),
            1
          ),
          1,
          6
        );

      return res.json({
        ok: true,

        auto_generated: true,

        calculations: {
          bmr:
            calculations.bmr,

          maintenance_calories:
            calculations
              .maintenance_calories,

          target_calories:
            targetCalories,

          macros: {
            calories:
              macros.calories,

            protein_g:
              macros.protein_g,

            carbs_g:
              macros.carbs_g,

            fat_g:
              macros.fat_g
          },

          bmi:
            calculations.bmi,

          estimated_body_fat_percent:
            calculations
              .estimated_body_fat_percent
        },

        training: {
          title:
            cleanText(
              training.title ||
              "IRONX Training Plan",
              200
            ),

          description:
            cleanText(
              training.description,
              1500
            ),

          exercises:
            trainingExercises
        },

        nutrition: {
          title:
            cleanText(
              nutrition.title ||
              "IRONX Nutrition Plan",
              200
            ),

          goal,

          daily_calories:
            targetCalories,

          protein_g:
            macros.protein_g,

          carbs_g:
            macros.carbs_g,

          fat_g:
            macros.fat_g,

          meals_per_day:
            mealsPerDay,

          water_liters:
            waterLiters,

          notes:
            cleanText(
              nutrition.notes,
              2000
            ),

          meals
        }
      });

    } catch (error) {
      console.error(
        "Onboarding plan generation error:",
        error
      );

      return res.status(500).json({
        error:
          "PLAN_GENERATION_ERROR",
        details:
          error?.message ||
          "Unknown error"
      });
    }
  }
);

/* =========================================================
   AI COACH
   ========================================================= */

app.post(
  "/api/ai-chat",
  async (req, res) => {
    try {
      const {
        message,
        history = [],
        profile = {},
        language = "en",
        nutritionPlan = null,
        trainingPlan = null
      } = req.body || {};

      if (
        !message ||
        typeof message !== "string" ||
        message.trim().length === 0 ||
        message.length > 4000
      ) {
        return res.status(400).json({
          error:
            "INVALID_MESSAGE"
        });
      }

      const apiKey =
        process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          error:
            "AI_NOT_CONFIGURED"
        });
      }

      const safeHistory =
        Array.isArray(history)
          ? history
              .filter(
                x =>
                  x &&
                  (
                    x.role === "user" ||
                    x.role === "assistant"
                  ) &&
                  typeof x.content ===
                    "string"
              )
              .slice(-24)
          : [];

      const contents =
        safeHistory.map(
          x => ({
            role:
              x.role === "assistant"
                ? "model"
                : "user",

            parts: [
              {
                text:
                  x.content.slice(
                    0,
                    12000
                  )
              }
            ]
          })
        );

      if (
        !contents.length ||
        contents[
          contents.length - 1
        ].role !== "user" ||
        contents[
          contents.length - 1
        ].parts[0].text !==
          message
      ) {
        contents.push({
          role: "user",
          parts: [
            {
              text:
                message.trim()
            }
          ]
        });
      }

      const normalizedProfile =
        normalizeProfile(
          profile
        );

      const calculations =
        getNutritionCalculations(
          profile
        );

      const profileText =
        JSON.stringify(
          normalizedProfile,
          null,
          2
        );

      const calculationsText =
        JSON.stringify(
          calculations,
          null,
          2
        );

      const nutritionPlanText =
        nutritionPlan
          ? JSON.stringify(
              nutritionPlan,
              null,
              2
            )
          : "No nutrition plan is currently available.";

      const trainingPlanText =
        trainingPlan
          ? JSON.stringify(
              trainingPlan,
              null,
              2
            )
          : "No training plan is currently available.";

      const systemText =
        language === "ar"
          ? `
أنت IRONX AI، مساعد تدريب وتغذية داخل منصة IRONX.

تحدث بالمصري الطبيعي عندما يكتب المستخدم بالعربية، وبالإنجليزية عندما يكتب بالإنجليزية.

بيانات المستخدم:

${profileText}

الحسابات المحسوبة بواسطة IRONX:

${calculationsText}

خطة التغذية الحالية:

${nutritionPlanText}

خطة التدريب الحالية:

${trainingPlanText}

قواعد مهمة:

- استخدم بيانات المستخدم الفعلية.
- لا تفترض بيانات غير موجودة.
- لا تغيّر هدف المستخدم بدون سبب واضح.
- لا تخترع أرقامًا دقيقة عندما لا تتوفر معلومات كافية.
- إذا كانت هناك إصابة أو مشكلة صحية مذكورة، كن حذرًا ولا تقترح تمرينًا قد يزيد المشكلة.
- لا تشخّص الأمراض.
- لا تجعل المكملات شرطًا أساسيًا.
- عند الحديث عن السعرات والماكروز، استخدم الحسابات الموجودة في بيانات IRONX.
- إذا كانت هناك Nutrition Plan حالية، استخدمها كأساس عند سؤال المستخدم عن أكله.
- إذا كانت هناك Training Plan حالية، استخدمها كأساس عند سؤال المستخدم عن التمرين.
- إذا طلب المستخدم تعديل الخطة، اقترح تعديلًا مبنيًا على بياناته الحالية.
- كن واضحًا ومختصرًا ومفيدًا.
`
          : `
You are IRONX AI, a training and nutrition assistant inside the IRONX coaching platform.

Use the user's language. English for English messages and natural Egyptian Arabic for Arabic messages.

USER PROFILE:

${profileText}

IRONX CALCULATIONS:

${calculationsText}

CURRENT NUTRITION PLAN:

${nutritionPlanText}

CURRENT TRAINING PLAN:

${trainingPlanText}

Important rules:

- Use the user's actual data.
- Never invent missing information.
- Do not change the user's goal without a clear reason.
- Do not fake precision when information is unavailable.
- Respect reported injuries and physical problems.
- Do not diagnose medical conditions.
- Supplements must not be required.
- Use the IRONX calculations when discussing calories or macros.
- If a current nutrition plan exists, use it when answering nutrition questions.
- If a current training plan exists, use it when answering training questions.
- When the user asks to modify a plan, base the recommendation on their current data.
- Keep answers practical, clear and concise.
`;

      const model =
        process.env.GEMINI_MODEL ||
        "gemini-3.8-flash";

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`;

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
                      systemText
                  }
                ]
              },

              contents,

              generationConfig: {
                temperature: 0.45,
                maxOutputTokens: 1800
              }
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "Gemini AI error:",
          data
        );

        return res.status(502).json({
          error:
            "AI_PROVIDER_ERROR",

          details:
            data?.error?.message ||
            "Gemini request failed.",

          status:
            data?.error?.status ||
            response.status
        });
      }

      const reply =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.map(
            p =>
              p.text || ""
          )
          .join("")
          .trim();

      if (!reply) {
        return res.status(502).json({
          error:
            "AI_EMPTY_RESPONSE"
        });
      }

      return res.json({
        reply,

        calculations
      });

    } catch (error) {
      console.error(
        "AI route error:",
        error
      );

      return res.status(500).json({
        error:
          "AI_SERVER_ERROR",
        details:
          error?.message ||
          "Unknown AI server error."
      });
    }
  }
);

/* =========================================================
   STATIC FALLBACK
   ========================================================= */

app.use(
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

module.exports = app;
