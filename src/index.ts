import { z } from 'zod';

/**
 * OllamaModerationProcessor handles content moderation using local LLM inference.
 * It processes text content and returns structured moderation decisions with built-in
 * error recovery and validation.
 */
class OllamaModerationProcessor {
  private maxRetries: number;
  private retryDelay: number;

  /**
   * Initialize the processor with retry settings
   * @param options Configuration for retry behavior
   */
  constructor(options: { maxRetries?: number; retryDelay?: number } = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
  }

  /**
   * Makes HTTP requests to the Ollama API
   * @param prompt The text prompt to send to the model
   * @returns Raw response string from the model
   */
  private async callOllama(prompt: string): Promise<string> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-r1:14b',
          prompt: prompt,
          stream: false,
          format: 'json'  // Forces JSON output - reduces malformed responses
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(`Failed to call Ollama: ${error.message}`);
    }
  }

  /**
   * Extracts valid JSON from the model's response text
   * Uses regex to find JSON objects even if surrounded by additional text
   * @param text Raw response from the model
   * @returns Parsed JSON object
   */
  private extractJSON(text: string): any {
    // Regular expression to find JSON object, handling nested structures
    const match = text.match(/{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/);
    if (!match) {
      throw new Error('No JSON object found in response');
    }

    try {
      return JSON.parse(match[0]);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }

  /**
   * Utility function to pause execution
   * Used between retry attempts to avoid overwhelming the API
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Processes content and returns structured moderation result
   * @param content The text content to moderate
   * @returns ModerationResult object
   */
  async processContent(content: string): Promise<ModerationResult> {
    const prompt = `
You are a content moderator. Analyze the following text and respond with valid JSON only.

Text to analyze:
${content}

Respond with exactly one JSON object containing these fields:
{
  "toxic": boolean,
  "spamLikelihood": number, // between 0 and 1
  "contentCategory": string,
  "recommendedAction": "approve" | "reject" | "review",
  "confidence": number, // between 0 and 1
  "explanation": string
}

Do not include any other text in your response.`;

    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const rawResponse = await this.callOllama(prompt);
        const json = this.extractJSON(rawResponse);
        
        // Validate with Zod schema
        const result = ModerationSchema.parse(json);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay);
        }
      }
    }

    throw new Error(`Failed after ${this.maxRetries + 1} attempts: ${lastError.message}`);
  }
}

// Define the Zod schema for validation
const ModerationSchema = z.object({
  toxic: z.boolean(),
  spamLikelihood: z.number()
    .min(0)
    .max(1)
    .describe('How likely is this spam (0-1)'),
  contentCategory: z.string(),
  recommendedAction: z.enum(['approve', 'reject', 'review']),
  confidence: z.number()
    .min(0)
    .max(1),
  explanation: z.string()
    .min(1)
    .max(500)
});

type ModerationResult = z.infer<typeof ModerationSchema>;

// Example usage
async function main() {
  const processor = new OllamaModerationProcessor({ maxRetries: 3 });
  
  try {
    const result = await processor.processContent('This is a great post about AI!');
    console.log('Moderation Result:', result);
  } catch (error) {
    console.error('Error processing content:', error.message);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { OllamaModerationProcessor, ModerationResult };
