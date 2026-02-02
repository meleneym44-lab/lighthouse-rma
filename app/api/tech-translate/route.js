import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Technical context for calibration and particle counter industry
const TECHNICAL_CONTEXT = `You are a technical translator specialized in the calibration and particle counter industry. 

Key terminology you must use correctly:
- Particle counter = Compteur de particules
- Calibration = Étalonnage (NOT calibration)
- Laser = Laser
- Flow rate = Débit
- Sensor = Capteur
- Probe = Sonde
- Sample = Échantillon
- Clean room = Salle blanche
- ISO standard = Norme ISO
- Certificate = Certificat
- Repair = Réparation
- Inspection = Inspection
- Quality control = Contrôle qualité
- Serial number = Numéro de série
- Model = Modèle
- Firmware = Firmware/Micrologiciel
- Software update = Mise à jour logicielle
- Replace/Replacement = Remplacer/Remplacement
- Adjustment = Réglage
- Verification = Vérification
- Cleaning = Nettoyage
- Contamination = Contamination
- Threshold = Seuil
- Channel = Canal
- Measurement = Mesure
- Accuracy = Précision
- Deviation = Écart
- Out of spec/specification = Hors spécification
- Within spec = Conforme aux spécifications
- Pass/Passed = Conforme
- Fail/Failed = Non conforme
- Pump = Pompe
- Filter = Filtre
- Optics = Optique
- Photodetector = Photodétecteur
- Inlet = Entrée
- Outlet = Sortie

Common phrases:
- "The device was calibrated" = "L'appareil a été étalonné"
- "Calibration performed according to ISO 21501-4" = "Étalonnage effectué selon la norme ISO 21501-4"
- "All channels passed" = "Tous les canaux sont conformes"
- "Device is within specification" = "L'appareil est conforme aux spécifications"
- "Laser cleaned and realigned" = "Laser nettoyé et réaligné"
- "Flow rate adjusted" = "Débit réglé"
- "No issues found" = "Aucun problème constaté" or "RAS (Rien À Signaler)"
- "Parts replaced" = "Pièces remplacées"
- "Additional work required" = "Travaux supplémentaires nécessaires"

Write in professional technical French suitable for service reports.`;

export async function POST(request) {
  try {
    const { text, mode } = await request.json();

    if (!text || !text.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    let systemPrompt, userPrompt;

    if (mode === "english-to-french") {
      // Two-step: Correct English, then translate to technical French
      systemPrompt = `${TECHNICAL_CONTEXT}

Your task is to:
1. First, correct the English text to proper, professional English (fix grammar, spelling, make it clear and professional)
2. Then, translate the corrected English into proper technical French using the correct industry terminology

Respond in this exact JSON format:
{
  "correctedEnglish": "The corrected, professional English version",
  "technicalFrench": "The proper technical French translation"
}

Only respond with the JSON, no other text.`;

      userPrompt = `Process this English text (it may be rough/informal):

"${text}"`;

    } else if (mode === "french-correct") {
      // Just correct the French
      systemPrompt = `${TECHNICAL_CONTEXT}

Your task is to correct and improve the French text:
- Fix any grammar or spelling errors
- Use proper technical terminology
- Make it professional and suitable for a service report
- Keep the same meaning

Respond in this exact JSON format:
{
  "correctedFrench": "The corrected, professional French version"
}

Only respond with the JSON, no other text.`;

      userPrompt = `Correct this French text:

"${text}"`;

    } else {
      return Response.json({ error: "Invalid mode" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Parse the response
    const content = response.content[0].text;
    
    // Try to parse as JSON
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      return Response.json(parsed);
    } catch (parseError) {
      // If JSON parsing fails, return the raw content
      console.error("JSON parse error:", parseError);
      return Response.json({ 
        correctedEnglish: text,
        technicalFrench: content,
        correctedFrench: content 
      });
    }

  } catch (error) {
    console.error("Tech translate error:", error);
    return Response.json(
      { error: "Translation failed: " + error.message },
      { status: 500 }
    );
  }
}
