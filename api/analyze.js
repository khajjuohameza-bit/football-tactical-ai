export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, team, opponent, formation, phase } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: "لم يتم إرسال صورة المباراة" });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY غير موجود" });
    }

    const prompt = `
أنت محلل تكتيكي محترف لكرة القدم.

حلل صورة المباراة اعتماداً فقط على ما يظهر فيها.

الفريق: ${team || "غير محدد"}
الخصم: ${opponent || "غير محدد"}
الخطة: ${formation || "غير محددة"}
مرحلة اللعب: ${phase || "غير محددة"}

حلل تمركز اللاعبين، شكل الفريق، البناء من الخلف، التقدم بالكرة، الضغط، المساحات بين الخطوط، التمركز الهجومي والدفاعي، ونقاط القوة والضعف التكتيكية.

أعط نصيحة عملية للمدرب.

لا تخترع أسماء اللاعبين أو تحركات غير واضحة.
إذا كانت معلومة غير واضحة، اذكر أنها غير واضحة.
أجب بالعربية وأرجع JSON فقط.

{
  "build": "تحليل البناء",
  "press": "تحليل الضغط",
  "attack": "تحليل الهجوم",
  "defense": "تحليل الدفاع",
  "score": 75,
  "advice": "نصيحة تكتيكية"
}

score رقم صحيح من 0 إلى 100.
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: image }
                }
              ]
            }
          ],
          temperature: 0.7,
          max_completion_tokens: 1500,
          response_format: { type: "json_object" }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "حدث خطأ أثناء الاتصال بـ Groq"
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "لم يرجع الذكاء الاصطناعي أي نتيجة"
      });
    }

    const result = JSON.parse(content);

    return res.status(200).json(result);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "حدث خطأ في الخادم"
    });
  }
}
