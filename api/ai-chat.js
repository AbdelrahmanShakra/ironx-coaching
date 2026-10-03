const crypto = require("crypto");

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://uibzmqioeumuhczljolu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || "";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || "";

const OPENAI_MODEL =
  process.env.OPENAI_MODEL || "gpt-5-mini";


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
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`
      }
    }
  );


  if (!response.ok) {
    return null;
  }


  return response.json();

}



module.exports = async function handler(req,res){


  if(req.method !== "POST"){
    return send(res,405,{
      error:"METHOD_NOT_ALLOWED"
    });
  }



  if(!OPENAI_API_KEY){

    return send(res,503,{
      error:"AI_NOT_CONFIGURED"
    });

  }



  try{


    const auth =
      req.headers.authorization || "";


    const token =
      auth.startsWith("Bearer ")
      ? auth.substring(7)
      : "";



    const user =
      await getUser(token);



    if(!user?.id){

      return send(res,401,{
        error:"UNAUTHORIZED"
      });

    }




    if(!allowed(user.id)){

      return send(res,429,{
        error:"RATE_LIMITED"
      });

    }




    const body =
      req.body || {};



    const message =
      typeof body.message === "string"
      ? body.message.trim()
      : "";



    if(!message){

      return send(res,400,{
        error:"MESSAGE_REQUIRED"
      });

    }



    if(message.length > 4000){

      return send(res,400,{
        error:"MESSAGE_TOO_LONG"
      });

    }




    const profile =
      body.profile || {};

    const language =
      body.language || "en";




    const aiResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {

          method:"POST",

          headers:{
            "Content-Type":"application/json",

            Authorization:
              `Bearer ${OPENAI_API_KEY}`
          },


          body:JSON.stringify({

            model:OPENAI_MODEL,


            instructions:
            `
You are IRONX AI Coach.

You help users with:
- training
- nutrition
- recovery
- fitness planning

Give short practical answers.

Do not diagnose medical conditions.
Do not replace doctors.

If the user reports serious pain, injury,
chest pain, fainting, or dangerous symptoms,
recommend professional medical help.

Never pretend to be a human coach.

User language:
${language}

User profile:
${JSON.stringify(profile)}
            `,


            input:[
              {
                role:"user",
                content:message
              }
            ],


            max_output_tokens:700

          })

        }

      );




    const data =
      await aiResponse.json();




    if(!aiResponse.ok){

      console.error(
        "OpenAI Error:",
        data
      );


      return send(res,502,{
        error:"AI_REQUEST_FAILED"
      });

    }




    return send(res,200,{

      reply:
        data.output_text ||
        "No response."

    });



  }catch(error){


    console.error(
      "API ERROR:",
      error
    );


    return send(res,500,{
      error:"SERVER_ERROR"
    });


  }


};
