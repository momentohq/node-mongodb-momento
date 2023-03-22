import mongoose from 'mongoose';
import dotenv from 'dotenv';
import wrapWithMomento, { Results } from './src/wrap-with-momento';
import axios from 'axios';
import Route from './models/route';
import path from 'path';
import { exec } from 'child_process';

dotenv.config();

const runQueries = async (times: number, useCache: boolean): Promise<number[]> => {
  // Connect to MongoDB
  await mongoose.connect(`${process.env.MONGODB_URI!}/${process.env.COLLECTION_NAME}`, { connectTimeoutMS: 1000 });
  const airlines = await Route.distinct('airline.name');

  if (useCache) {
    wrapWithMomento();
  }

  const queryTimes: number[] = [];

  //
  // Run the quries in parallel
  //
  // const arr = Array(times).fill(0);
  // await Promise.all(arr.map(async () => {
  //   const randomAirline = airlines[Math.floor(Math.random() * airlines.length)];
  //   const start = Date.now();
  //   await Route.find({ 'airline.name': randomAirline });
  //   const end = Date.now();
  //   queryTimes.push(end - start);
  // }));

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
  stats: { [key: string]: { avg: number; p99: number; min: number; max: number; median: number; stdDev: number, count: number } }): Promise<string> => {
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
            labels: ['# of Requests', 'Average Duration (ms)', 'P99 (ms)', 'Min (ms)', 'Max (ms)', 'Median (ms)', 'Std Dev (ms)'],
            datasets: [
              {
                label: 'Without Cache',
                data: [
                  ${stats.withoutCache.count},
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
                label: 'With Cache (Hits)',
                data: [
                  ${stats.cacheHits.count},
                  ${stats.cacheHits.avg},
                  ${stats.cacheHits.p99},
                  ${stats.cacheHits.min},
                  ${stats.cacheHits.max},
                  ${stats.cacheHits.median},
                  ${stats.cacheHits.stdDev},
                ],
                backgroundColor: 'rgba(255, 206, 86, 0.2)',
                borderColor: 'rgba(255, 206, 86, 1)',
                borderWidth: 1
              },
              {
                label: 'With Cache (Misses)',
                data: [
                  ${stats.cacheMisses.count},
                  ${stats.cacheMisses.avg},
                  ${stats.cacheMisses.p99},
                  ${stats.cacheMisses.min},
                  ${stats.cacheMisses.max},
                  ${stats.cacheMisses.median},
                  ${stats.cacheMisses.stdDev},
                ],
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
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
  const count = queryTimes.length;
  const sum = queryTimes.reduce((a, b) => a + b, 0);
  const avg = sum / queryTimes.length;
  const min = Math.min(...queryTimes);
  const max = Math.max(...queryTimes);
  const stdDev = Math.sqrt(queryTimes.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / queryTimes.length);

  queryTimes.sort((a, b) => a - b);
  const p99 = queryTimes[Math.floor(queryTimes.length * 0.99)];
  const median = queryTimes[Math.floor(queryTimes.length * 0.5)];
  return { avg, p99, min, max, median, stdDev, count };
};

(async () => {
  const numQueries = parseInt(process.argv[2], 10);

  const timesWithoutCache = await runQueries(numQueries, false);
  await runQueries(numQueries, true);

  const stats = {
    withoutCache: analyzeQueryTimes(timesWithoutCache),
    cacheHits: analyzeQueryTimes(Results.hits),
    cacheMisses: analyzeQueryTimes(Results.misses)
  };

  const html = await generateHtml(numQueries, stats);

  // Save the generated HTML to a file and open it in a browser
  const filename = 'performance_comparison.html';
  require('fs').writeFileSync(filename, html);
  const filePath = path.join(__dirname, filename);

  const command = process.platform == 'win32' ? 'start' : 'open';
  exec(`${command} ${filePath}`);

  console.log('Completed the demo. Analytic summary:\n');
  console.log('MongoDB only\n', '-------------------\n', `Average duration: ${Math.round(stats.withoutCache.avg)}ms\n`, `P99: ${stats.withoutCache.p99}ms\n`, `Median: ${stats.withoutCache.median}ms\n`, `Minimum: ${stats.withoutCache.min}ms\n`, `Maximum: ${stats.withoutCache.max}ms\n`);
  console.log(`Momento Cache Hits (${Math.round(((stats.cacheHits.count / numQueries) * 100))}%)\n`, '-------------------\n', `Average duration: ${Math.round(stats.cacheHits.avg)}ms\n`, `P99: ${stats.cacheHits.p99}ms\n`, `Median: ${stats.cacheHits.median}ms\n`, `Minimum: ${stats.cacheHits.min}ms\n`, `Maximum: ${stats.cacheHits.max}ms\n`);
  console.log(`Momento Cache Misses (${Math.round(((stats.cacheMisses.count / numQueries) * 100))}%)\n`, '-------------------\n', `Average duration: ${Math.round(stats.cacheMisses.avg)}ms\n`, `P99: ${stats.cacheMisses.p99}ms\n`, `Median: ${stats.cacheMisses.median}ms\n`, `Minimum: ${stats.cacheMisses.min}ms\n`, `Maximum: ${stats.cacheMisses.max}ms`);
})();
