import mongoose from 'mongoose';
import dotenv from 'dotenv';
import wrapWithMomento from './src/wrap-with-momento';
import axios from 'axios';
import Route from './models/route';

dotenv.config();

const runQueries = async (times: number, useCache: boolean): Promise<number[]> => {
  // Connect to MongoDB
  await mongoose.connect(`${process.env.MONGODB_URI!}/${process.env.COLLECTION_NAME}`, { connectTimeoutMS: 1000 });
  const airlines = await Route.distinct('airline.name');

  if (useCache) {
    wrapWithMomento();
  }

  const queryTimes: number[] = [];

  for (let i = 0; i < times; i++) {
    if (i % 100 == 0) {
      console.log(`Iteration ${i}`);
    }
    const randomAirline = airlines[Math.floor(Math.random() * airlines.length)];
    const start = Date.now();
    await Route.find({ 'airline.name': randomAirline });
    const end = Date.now();
    queryTimes.push(end - start);
  }

  await mongoose.disconnect();

  return queryTimes;
};

const generateHtml = async (
  numQueries: number,
  stats: { [key: string]: { avg: number; p99: number; min: number; max: number; median: number; stdDev: number } }): Promise<string> => {
  const { data } = await axios.get('https://cdn.jsdelivr.net/npm/chart.js');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Performance Comparison</title>
      <script>${data}</script>
    </head>
    <body>
      <h1>Performance Comparison for ${numQueries} Iterations</h1>
      <div>
        <canvas id="comparisonChart" width="600" height="400"></canvas>
      </div>
      <script>
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        const comparisonChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Average Duration', 'P99', 'Min', 'Max', 'Median', 'Std Dev'],
            datasets: [
              {
                label: 'Without Cache',
                data: [
                  ${stats.withoutCache.avg},
                  ${stats.withoutCache.p99},
                  ${stats.withoutCache.min},
                  ${stats.withoutCache.max},
                  ${stats.withoutCache.median},
                  ${stats.withoutCache.stdDev},
                ],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
              },
              {
                label: 'With Cache',
                data: [
                  ${stats.withCache.avg},
                  ${stats.withCache.p99},
                  ${stats.withCache.min},
                  ${stats.withCache.max},
                  ${stats.withCache.median},
                  ${stats.withCache.stdDev},
                ],
                backgroundColor: 'rgba(255, 206, 86, 0.2)',
                borderColor: 'rgba(255, 206, 86, 1)',
                borderWidth: 1
              }
            ]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;
};

const analyzeQueryTimes = (queryTimes: number[]) => {
  const sum = queryTimes.reduce((a, b) => a + b, 0);
  const avg = sum / queryTimes.length;
  const min = Math.min(...queryTimes);
  const max = Math.max(...queryTimes);
  const stdDev = Math.sqrt(queryTimes.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / queryTimes.length);

  queryTimes.sort((a, b) => a - b);
  const p99 = queryTimes[Math.floor(queryTimes.length * 0.99)];
  const median = queryTimes[Math.floor(queryTimes.length * 0.5)];
  return { avg, p99, min, max, median, stdDev };
};

(async () => {
  const numQueries = parseInt(process.argv[2], 10);

  const timesWithoutCache = await runQueries(numQueries, false);
  const timesWithCache = await runQueries(numQueries, true);

  const stats = {
    withoutCache: analyzeQueryTimes(timesWithoutCache),
    withCache: analyzeQueryTimes(timesWithCache),
  };

  const html = await generateHtml(numQueries, stats);

  // Save the generated HTML to a file
  require('fs').writeFileSync('performance_comparison.html', html);

  console.log('HTML file generated: performance_comparison.html');
})();
