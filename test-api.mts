import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const key = env.split('=')[1].trim();

async function main() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  
  if (data.models) {
    const models = data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name);
    console.log("AVAILABLE MODELS:", models);
  } else {
    console.log("ERROR:", data);
  }
}

main();
