# JSON.Engine

A self-healing LLM JSON processor with Zod and Ollama (DeepSeek-R1)

## Overview

This project demonstrates how to build a reliable system for getting structured data from language models. It focuses on ensuring JSON responses are valid and automatically fixing them when they're not.

## Features

- ✅ Language models can give us data in a structured format we can use in our applications
- ✅ Automatically fix errors when the model gives us bad JSON
- ✅ Type-safe system that helps catch bugs early
- ✅ Retry failed requests with helpful feedback
- ✅ Everything runs locally - perfect for development and debugging

## Benefits

- **Structured Output**: Get consistent, predictable data from LLMs
- **Error Recovery**: Automatically fix common JSON formatting issues
- **Type Safety**: Use Zod schemas to validate and enforce data shapes
- **Local Processing**: Run everything locally without external dependencies

## Getting Started

### Prerequisites

1. Node.js installed
2. Ollama installed (see [Ollama setup guide](https://ollama.com/))
3. Pull the DeepSeek-R1 model: `ollama pull deepseek-r1:14b`

### Installation

bash
npm install


### Usage

typescript
import { OllamaModerationProcessor } from './src/index';

const processor = new OllamaModerationProcessor({ maxRetries: 3 });

try {
  const result = await processor.processContent('Your text content here');
  console.log(result);
} catch (error) {
  console.error('Error:', error.message);
}


## Architecture

### Model Selection

For complex analysis with reasoning:
- `deepseek-r1:8b` or `deepseek-r1:14b` - Best for nuanced analysis and edge cases
- Shows chain-of-thought reasoning in `<think>` tags
- Slower (3-8 seconds) but excellent for judgment tasks

For fast, reliable structured output:
- `qwen2.5:7b` - Excellent at JSON, faster than reasoning models
- `llama3.2:3b` - Very fast, good for simple schemas
- `mistral:7b` - Reliable for structured data with good instruction following

### Error Recovery Process

1. Send prompt to Ollama
2. Extract potential JSON from response
3. Validate with Zod schema
4. Retry on failure with exponential backoff
5. Return clean, validated result

## Advanced Tips

- Use reasoning models for complex decision-making tasks
- Use standard models for simple structured output tasks
- Implement proper retry logic with delays
- Monitor performance and adjust model selection accordingly

## License

MIT
