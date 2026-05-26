import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const NIM_API_KEY = process.env.NIM_API_KEY;

export const nim = createOpenAICompatible({
  name: 'nim',
  apiKey: NIM_API_KEY || 'dummy',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const  siora_openai_oss = nim.chatModel('openai/gpt-oss-120b');  
// ('openai/gpt-oss-120b'),