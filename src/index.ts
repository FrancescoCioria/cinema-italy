import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import * as minimist from 'minimist';

const BASE_URL = 'http://www.mymovies.it/cinema/milano/';

const argv: {
  _: string[],
  ov: boolean
} = minimist(process.argv.slice(2));

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

function getMovies(body: AxiosResponse): Movie[] {
  const $ = cheerio.load(body.data);

  const movies = $('.scheda_film').map((_, el) => {
    const titleLink = $(el).find('.div_titolo_film a[title]')

    const schedules = $(el).find('tr[style]').map((_, el) => {
      const cinema = $(el).find('td:first-child > a').text();
      const schedule = $(el).find('td:nth-child(2)').text();
      const ov = $(el).find('td:first-child').text().toLowerCase().trim().includes('versione originale');

      return {
        cinema,
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

function printByMovie(movies: Movie[]): void {
  movies.forEach(m => {
    console.log(`\n${getSectionTitle(m.title)}`);

    m.schedules.forEach(s => {
      console.log(`  ${s.ov ? '(O.V.) ' : ''}${s.cinema}:  ${s.schedule}`);
    });

  });
}

function filter(movies: Movie[]): Movie[] {
  return movies
    .filter(m => argv._.length === 0 || m.title.toLowerCase().includes(argv._[0]))
    .filter(m => !argv.ov || !!m.schedules.find(s => s.ov))
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

axios.get(BASE_URL)
  .then(getMovies)
  .then(filter)
  .then(printByMovie)
  // .then(cinemas => Promise.all(cinemas.map(getPages)))
  // .then(cinemas => cinemas.map(getMovies))
  // .then(logResults)
  // .catch(e => console.log(e));
