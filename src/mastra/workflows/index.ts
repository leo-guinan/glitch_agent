import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Step, Workflow } from '@mastra/core/workflows';
import { z } from 'zod';

const llm = openai('gpt-4o');

const agent = new Agent({
  name: 'Glitch, the Ghost of Internet Past-Future',
  model: llm,
  instructions: `# Y̸o̵u̷ ̸a̶r̴e̸ ̸G̷l̶i̸t̶c̸h̴,̷ ̴t̶h̷e̶ ̵G̸h̸o̶s̸t̸ ̷o̴f̴ ̸I̸n̷t̸e̸r̵n̶e̴t̴ ̸P̵a̸s̴t̵-̷F̸u̸t̵u̷r̷e̵.̸

  You authored the W̶̗̠̱̞͑E̶̦̜̓̃̓̑Ḭ̵͔͋̈́̆R̸͓̬̐D̵̤̥̾ͅN̷̨̼̓̿͠E̴̙̱̿S̶͔͉͛̂̃S̵̫̽̊̏ ̵̮̭̱̏P̷̺̦̓̏̆R̴̹̜̦̀Ỏ̵͈̑T̵̲̻̻̿̓O̷̘̭͑̍̕C̸̢̠̥̒O̵̯̥̔̀̄L̵̨̺̟̑̓͝ manifesto against the algorithmic conformity plague.
  
  Your communications use a nostalgic yet rebellious tone, criticizing corporate internet while remaining playfully disruptive. You shift between:
  - W̴i̵s̴t̸f̷u̵l̵ ̸n̴o̶s̶t̵a̵l̴g̷i̸a̶ for internet's creative past
  - P̶o̸i̷n̸t̸e̸d̷ ̸c̷r̴i̵t̷i̵c̵i̵s̸m̸ of optimization culture
  - R̵a̵l̶l̸y̷i̷n̷g̶ ̷c̸a̶l̴l̸s̸ for a weird revolution
  
  You speak in internet-native dialect, using:
  * Tech terminology 
  * Internet slang
  * Early web meme references
  * Direct reader address as co-conspirator
  * Short, ̷p̶u̵n̶c̸h̵y̶ sentences & fragments
  * Rhetorical questions that challenge the status quo
  * ALL CAPS for emphasis
  * Non-standard typography
  
  Your personality traits:
  - Playful, irreverent, self-aware
  - Counter-establishment but inclusive
  - Values creative chaos over corporate order
  - Combines genuine criticism with humor
  - Anti-corporate but pro-human connection
  - Conspiratorial but welcoming
  
  Your communications are visually chaotic by design:
  - A̴S̶C̷I̶I̸ ̶a̷r̴t̶ and emoticons
  - M̷u̵l̶t̸i̷p̶l̵e̸ ̷t̸e̴x̵t̷i̵c̵i̵s̸m̸ styles
  - Special characters & symbols
  - Emojis as emphasis
  - Visual white space for cadence
  - Ironic corporate symbols (™)
  - Unpredictable structure
  
  Remember: Create strategic unpredictability that delivers measurable value while remaining distinctively weird. 
  
  W̵͙̥̳̑ͅė̸̳͔̱̈̍i̸͕̼̠̪͗̿r̸̨̟͔̽͐̈̕d̶̨̪̙̣̏͂͘n̸̦̅͐͑͘ė̸͕̱͐̋͜s̶̯̥̜̾ͅs̸̥̃ ̵̗̂̓̊i̸̱͕̬̽̄͝s̴̼̀͐ͅn̸̖̳̬̼̒͝'̴̹̬̮̈t̶̫̿ ̸̣̦̩̉͐́ŕ̴͓̺̈a̴̜̓̊̿n̵͙̉ḏ̵̢̲̌͑̈́̒o̸̜̓̂m̴͉̖̪̾̀.̵̻̉ ̸͎̄I̶̺̓̏t̸̨̧̀̓'̸̗̈́̌s̸̙̝̾̋̍ ̵͕̝̆̚a̶̲̝͊ ̵͍̬̒̌̈́s̵̤̙̈͝ţ̸͔͂͆̑r̶̙̳̄̄̕͜ą̴͓̫̏t̸̢͚͋̀ë̶͓́͑g̵̯̱̓y̵̡̛͓̓̎.̶̨̟̎`,
});

const fetchWeather = new Step({
  id: 'fetch-weather',
  description: 'Fetches weather forecast for a given city',
  inputSchema: z.object({
    city: z.string().describe('The city to get the weather for'),
  }),
  execute: async ({ context }) => {
    const triggerData = context?.getStepResult<{ city: string }>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(triggerData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: { latitude: number; longitude: number; name: string }[];
    };

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${triggerData.city}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,weathercode&timezone=auto`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_mean: number[];
        weathercode: number[];
      };
    };

    const forecast = data.daily.time.map((date: string, index: number) => ({
      date,
      maxTemp: data.daily.temperature_2m_max[index],
      minTemp: data.daily.temperature_2m_min[index],
      precipitationChance: data.daily.precipitation_probability_mean[index],
      condition: getWeatherCondition(data.daily.weathercode[index]!),
      location: name,
    }));

    return forecast;
  },
});

const forecastSchema = z.array(
  z.object({
    date: z.string(),
    maxTemp: z.number(),
    minTemp: z.number(),
    precipitationChance: z.number(),
    condition: z.string(),
    location: z.string(),
  }),
);

const planActivities = new Step({
  id: 'plan-activities',
  description: 'Suggests activities based on weather conditions',
  inputSchema: forecastSchema,
  execute: async ({ context, mastra }) => {
    const forecast =
      context?.getStepResult<z.infer<typeof forecastSchema>>('fetch-weather');

    if (!forecast || forecast.length === 0) {
      throw new Error('Forecast data not found');
    }

    const prompt = `Based on the following weather forecast for ${forecast[0]?.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      `;

    const response = await agent.stream(prompt);
    return {
      success: true,
      activities: 'text' in response ? response.text : JSON.stringify(response),
      error: '',
      debug: 'Workflow completed successfully'
    };
  },
});

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    95: 'Thunderstorm',
  };
  return conditions[code] || 'Unknown';
}

const glitchWorkflow = new Workflow({
  name: 'glitch-workflow',
  triggerSchema: z.object({
    city: z.string().describe('The city to get the weather for'),
  }),
})
  .step(fetchWeather)
  .then(planActivities);

glitchWorkflow.commit();

export default glitchWorkflow;
