## Contributing

### Building

Open a terminal window.

Clone the davinci-csv repo:
```
git clone git://github.com/geometryzen/davinci-csv.git
```

Change to the repo directory:
```
cd davinci-csv
```

Install NPM:
```
npm install
npm update
```
to install the tooling dependencies (For this you need to have [Node.js](http://nodejs.org) installed).

Install Bower:
```
bower install
bower update
```
to install the software dependencies (For this you need to have [Bower](http://bower.io) installed).

Install JSPM:
```
jspm install
jspm update
```
to install JSPM, used for testing.

Install TypeScript definitions:
```
tsd install
```
to install TypeScript definitions for Jasmine used in testing.

```
grunt
```
to compile the source using the TypeScript compiler (For this you need to have [TypeScript](http://www.typescriptlang.org) installed) and to package the individual files into a single JavaScript file.

## Making Changes

Make your changes to the TypeScript files in the _src_ directory. Do not edit the files in the _dist_ directory, these files will be generated.

## Testing

```
karma start
```

## Versioning

The following files should be changed.

```
src/davinci-csv/config.ts
package.json
bower.json
```

## Git

```
git add --all
git commit -m '...'
git tag -a 1.2.3 -m '...'
git push origin master --tags
npm publish
```