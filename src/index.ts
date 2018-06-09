import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import flatten = require('lodash/flatten');
import groupBy = require('lodash/groupBy');
import values = require('lodash/values');
import sortBy = require('lodash/sortBy');
import capitalize = require('lodash/capitalize');
import mapValues = require('lodash/mapValues');
import * as Table from 'cli-table';
import * as console from 'better-console';
import { parseArgs, printUsageGuide } from './args';

const args = parseArgs();

const freeTextQuery = (args._unknown || []).join(' ');

if (args.version) {
  console.log(require('../package.json').version);
  process.exit(0);
}

if (args.help) {
  console.log(printUsageGuide());
  process.exit(0);
}

console.info(`
Free text query: "${freeTextQuery}"
Group by: ${args.cinema ? 'Cinema' : 'Movie'}
City: ${capitalize(args.city)}
Only movies projected in original version: ${args.ov}
`);

const urls = [
  `http://www.mymovies.it/cinema/${args.city}/`,
  `http://www.mymovies.it/cinema/${args.city}/provincia`
]

type Movie = {
  title: string,
  href: string,
  schedules: Schedule[]
}

type Schedule = {
  cinema: string,
  schedule: string[],
  ov: boolean
}

type CinemaMovie = {
  schedule: string[],
  ov: boolean,
  title: string,
  cinema: string
}

type CinemasMap = {
  [k: string]: CinemaMovie[]
}

function getMovies(body: AxiosResponse): Movie[] {
  const $ = cheerio.load(body.data);

  const movies = $('.scheda_film').map((_, el) => {
    const titleLink = $(el).find('.div_titolo_film a[title]')

    const schedules = $(el).find('tr[style]').map((_, el) => {
      const cinema = $(el).find('td:first-child > a').text();
      const city = $(el).find('td:first-child > span').text().replace('Versione originale', '');
      const schedule = $(el).find('td:nth-child(2)').text();
      const ov = $(el).find('td:first-child').text().toLowerCase().trim().includes('versione originale');

      return {
        cinema: `${cinema} (${city})`,
        schedule,
        ov
      }
    }).toArray()

    return {
      title: $(titleLink).attr('title') || '',
      href: $(titleLink).attr('href') || '',
      schedules
    };
  }).toArray() as any as Movie[];

  return movies;
}

function filterMovie(movies: Movie[]): Movie[] {
  return movies
    .filter(m => !freeTextQuery || m.title.toLowerCase().includes(freeTextQuery))
}

function filterCinema(movies: Movie[]): Movie[] {
  return movies
    .filter(m => !freeTextQuery || m.schedules.find(s => s.cinema.toLowerCase().includes(freeTextQuery)))
    .map(m => {
      if (freeTextQuery) {
        return {
          ...m,
          schedules: m.schedules.filter(s => s.cinema.toLowerCase().includes(freeTextQuery[0]))
        }
      }
      return m;
    })
}

function filterByFreeText(movies: Movie[]): Movie[] {
  if (args.cinema) {
    return filterCinema(movies);
  } else {
    return filterMovie(movies);
  }
}

function filterOV(movies: Movie[]): Movie[] {
  return movies.filter(m => !args.ov || !!m.schedules.find(s => s.ov))
    .map(m => {
      if (args.ov) {
        return {
          ...m,
          schedules: m.schedules.filter(s => s.ov)
        }
      }
      return m;
    })
}

function printByMovie(movies: Movie[]): void {
  movies.forEach(m => {
    const table = new Table({
      head: ['Cinema', 'Schedule']
    })
    sortBy(m.schedules, 'schedule').forEach(s => table.push([(s.ov ? '(O.V.) ' : '') + s.cinema, s.schedule]))

    console.warn(`\n ${m.title.toUpperCase()}`);
    console.log(table.toString());
  });
}

function printByCinema(movies: Movie[]): void {
  const schedules: CinemaMovie[] = flatten(movies.map(m => m.schedules.map(s => ({ title: m.title, ...s }))));
  const cinemasMap: CinemasMap = groupBy(schedules, s => s.cinema);

  Object.keys(cinemasMap).forEach(cinema => {
    const table = new Table({
      head: ['Movie', 'Schedule']
    })
    sortBy(cinemasMap[cinema], 'schedule').forEach(m => table.push([(m.ov ? '(O.V.) ' : '') + m.title, m.schedule]))

    console.warn(`\n ${cinema.toUpperCase()}`);
    console.log(table.toString());
  });
}

function print(movies: Movie[]): void {
  if (movies.length === 0) {
    console.warn('\nNo movies found');
    return;
  }

  if (args.cinema) {
    printByCinema(movies);
  } else {
    printByMovie(movies);
  }
}

Promise.all(urls.map((url) => axios.get(url)))
  // concat pages results
  .then((res: AxiosResponse[]) => res.map(getMovies).reduce((acc, movies) => acc.concat(movies)))
  // group same movies from different pages
  .then(movies => values(mapValues(
    groupBy(movies, m => m.title),
    ms => ms.reduce((acc, m) => ({ ...acc, schedules: acc.schedules.concat(m.schedules) }))
  )))
  .then(filterByFreeText)
  .then(filterOV)
  .then(print)
  .then(() => console.log('\n'))
