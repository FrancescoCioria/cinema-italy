# Cinema Italy 🇮🇹🎥
CLI to list movies/cinemas schedules in Italy's cities.

```sh
npm i -g cinema-italy
```

## Print movies schedule
By default it prints the schedule of each movie showing in which cinemas and when they are playing:

![image](https://user-images.githubusercontent.com/4029499/38526583-353a9d34-3c57-11e8-92b6-5da0190b36b0.png)

## Print cinemas schedule
Pass the boolean arg `--cinema` to print the cinema schedule instead:

![image](https://user-images.githubusercontent.com/4029499/38526609-5802f50a-3c57-11e8-9da8-5905b896206e.png)

## Change city
The default city is *Milano* (and its province), to change it pass a city with the `--city` string arg:

```sh
--city roma
```

The results include the movies projected in the city's province.

Notes:
- the city must be passed in *italiano*
- only major cities are supported (*capoluoghi di provincia*)

## Filter
### Full text query
The main argument is treated as full text query and used to filter the movies (cinemas if `--cinema`) whose title includes the query.

### Original Version
Finding a movie not dubbed in Italy is hard... pass the `--ov` boolean arg to show only the movies played in the original language.
