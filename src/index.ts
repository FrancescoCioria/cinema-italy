import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import * as minimist from 'minimist';
import flatten = require('lodash/flatten');
import groupBy = require('lodash/groupBy');
import values = require('lodash/values');
import mapValues = require('lodash/mapValues');
import * as Table from 'cli-table';
import * as console from 'better-console';

const argv: {
  _: string[],
  ov?: boolean,
  cinema?: boolean,
  city?: string
} = minimist(process.argv.slice(2)) as any;

console.info('\nFree text query:', `"${argv._.join(' ')}"`);
console.info('Print cinemas:', !!argv.cinema);
console.info('City:', argv.city || 'Milano');
console.info('Only O.V.:', !!argv.ov);

const urls = [
  `http://www.mymovies.it/cinema/${argv.city || 'milano'}/`,
  `http://www.mymovies.it/cinema/${argv.city || 'milano'}/provincia`
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
  const query = argv._.join(' ');
  return movies
    .filter(m => !query || m.title.toLowerCase().includes(query))
}

function filterCinema(movies: Movie[]): Movie[] {
  const query = argv._.join(' ');
  return movies
    .filter(m => !query || m.schedules.find(s => s.cinema.toLowerCase().includes(query)))
    .map(m => {
      if (query) {
        return {
          ...m,
          schedules: m.schedules.filter(s => s.cinema.toLowerCase().includes(argv._[0]))
        }
      }
      return m;
    })
}

function filterByFreeText(movies: Movie[]): Movie[] {
  if (argv.cinema) {
    return filterCinema(movies);
  } else {
    return filterMovie(movies);
  }
}

function filterOV(movies: Movie[]): Movie[] {
  return movies.filter(m => !argv.ov || !!m.schedules.find(s => s.ov))
    .map(m => {
      if (argv.ov) {
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
    m.schedules.forEach(s => table.push([s.cinema, s.schedule]))

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
    cinemasMap[cinema].forEach(m => table.push([m.title, m.schedule]))

    console.warn(`\n ${cinema.toUpperCase()}`);
    console.log(table.toString());
  });
}

function print(movies: Movie[]): void {
  if (argv.cinema) {
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
