# Cinema Italy 🇮🇹🎥
CLI to list movies/cinemas schedules in Italy's cities.

## Print movies schedule
By default it prints the schedule of each movie showing in which cinemas and when they are playing:

![image](https://user-images.githubusercontent.com/4029499/38522992-86d093cc-3c4a-11e8-8475-5dd9e9fdcc45.png)

## Print cinemas schedule
Pass the boolean arg `--cinema` to print the cinema schedule instead:

![image](https://user-images.githubusercontent.com/4029499/38523068-b6266e26-3c4a-11e8-84f1-42523b71dcec.png)

## Change city
The default city is Milano (and its province), to change it pass a city with the `--city` string arg:

```sh
--city roma
```

The results include the movies projected in the city's province.

Note: the city must be passed in *italiano*
Note2: only major cities are supported (*capoluoghi di provincia*)

## Filter
### Full text query
The main argument is treated as full text query and used to filter the movies (cinemas if `--cinema`) whose title includes the query.

### Original Version
Finding a movie not dubbed in Italy is hard... pass the `--ov` boolean arg to show only the movies played in the original language.
