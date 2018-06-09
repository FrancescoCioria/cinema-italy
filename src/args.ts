import * as commandLineArgs from 'command-line-args';
import * as commandLineUsage from 'command-line-usage';

const optionDefinitions = {
  ov: { type: Boolean, defaultValue: false, description: 'List only movies projected in original version' },
  cinema: { type: Boolean, defaultValue: false, description: 'Group results by cinema instead of by movie' },
  city: { type: String, defaultValue: 'milano', description: 'Search movies in this city' },
  version: { alias: 'v', type: Boolean, description: 'Print the current version of this CLI.' },
  help: { alias: 'h', type: Boolean, description: 'Print this usage guide.' }
}

type Args = {
  [k in keyof typeof optionDefinitions]: (typeof optionDefinitions)[k]['type'] extends StringConstructor ? string : boolean
} & {
  _unknown?: string[]
}

const optionDefinitionsKeys = Object.keys(optionDefinitions) as (keyof typeof optionDefinitions)[]
const options = optionDefinitionsKeys.map(name => ({
  ...optionDefinitions[name],
  name
}));

export const parseArgs = (): Args => commandLineArgs(options, { partial: true }) as Args;

const sections = [
  {
    header: '🎥 Cinema Italy 🇮🇹',
    content: 'CLI to list movies/cinemas schedules in Italy\'s cities.'
  },
  {
    header: 'Options',
    optionList: options
  }
]

export const printUsageGuide = () => commandLineUsage(sections)
