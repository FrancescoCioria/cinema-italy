import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import * as minimist from 'minimist';
import flatten = require('lodash/flatten');
import groupBy = require('lodash/groupBy');

const argv: {
  _: string[],
  ov?: boolean,
  cinema?: boolean,
  city?: string
} = minimist(process.argv.slice(2)) as any;

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

function getSectionTitle(title: string): string {
  const dashes = [...Array(title.length)].map(() => '-').join('');
  return `${dashes}\n${title}\n${dashes}`
}

function filterMovie(movies: Movie[]): Movie[] {
  const query = argv._.join(' ');
  return movies
    .filter(m => query || m.title.toLowerCase().includes(query))
}

function filterCinema(movies: Movie[]): Movie[] {
  const query = argv._.join(' ');
  return movies
    .filter(m => query || m.schedules.find(s => s.cinema.toLowerCase().includes(query)))
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
    console.log(`\n${getSectionTitle(m.title)}`);

    m.schedules.forEach(s => {
      console.log(`  ${s.ov ? '(O.V.) ' : ''}${s.cinema}:  ${s.schedule}`);
    });

  });
}

function printByCinema(movies: Movie[]): void {
  const schedules: CinemaMovie[] = flatten(movies.map(m => m.schedules.map(s => ({ title: m.title, ...s }))));
  const cinemasMap: CinemasMap = groupBy(schedules, s => s.cinema);

  Object.keys(cinemasMap).forEach(cinema => {
    console.log(`\n${getSectionTitle(cinema)}`);

    cinemasMap[cinema].forEach(cinemaMovie => {
      console.log(`  ${cinemaMovie.ov ? '(O.V.) ' : ''}${cinemaMovie.title}:  ${cinemaMovie.schedule}`);
    });
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
  .then((res: AxiosResponse[]) => res.map(getMovies).reduce((acc, movies) => acc.concat(movies)))
  .then(filterByFreeText)
  .then(filterOV)
  .then(print)
