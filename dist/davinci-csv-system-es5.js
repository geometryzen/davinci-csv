System.register('davinci-csv/config.js', [], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var Config, config;
    return {
        setters: [],
        execute: function () {
            Config = function () {
                function Config() {
                    this.GITHUB = 'https://github.com/geometryzen/davinci-csv';
                    this.LAST_MODIFIED = '2017-05-13';
                    this.NAMESPACE = 'CSV';
                    this.VERSION = '0.9.3';
                }
                return Config;
            }();
            config = new Config();
            exports_1("default", config);
        }
    };
});
System.register("davinci-csv/core/CSV.js", [], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    function chomp(s, lineterminator) {
        if (s.charAt(s.length - lineterminator.length) !== lineterminator) {
            return s;
        } else {
            return s.substring(0, s.length - lineterminator.length);
        }
    }
    function normalizeLineTerminator(csvString, dialect) {
        if (dialect === void 0) {
            dialect = {};
        }
        if (!dialect.lineTerminator) {
            return csvString.replace(/(\r\n|\n|\r)/gm, '\n');
        }
        return csvString;
    }
    function dataToArrays(data) {
        var arrays = [];
        var fieldNames = [];
        for (var ii = 0; ii < data.fields.length; ii++) {
            fieldNames.push(data.fields[ii].id);
        }
        arrays.push(fieldNames);
        for (var ii = 0; ii < data.records.length; ii++) {
            var tmp = [];
            var record = data.records[ii];
            for (var jj = 0; jj < fieldNames.length; jj++) {
                tmp.push(record[fieldNames[jj]]);
            }
            arrays.push(tmp);
        }
        return arrays;
    }
    exports_1("dataToArrays", dataToArrays);
    function normalizeDialectOptions(dialect) {
        var options = {
            delim: ',',
            escape: true,
            lineTerm: '\n',
            quoteChar: '"',
            skipRows: 0,
            trim: true
        };
        if (dialect) {
            if (typeof dialect.fieldDelimiter === 'string') {
                options.delim = dialect.fieldDelimiter;
            }
            if (typeof dialect.escapeEmbeddedQuotes === 'boolean') {
                options.escape = dialect.escapeEmbeddedQuotes;
            }
            if (typeof dialect.lineTerminator === 'string') {
                options.lineTerm = dialect.lineTerminator;
            }
            if (typeof dialect.quoteChar === 'string') {
                options.quoteChar = dialect.quoteChar;
            }
            if (typeof dialect.skipInitialRows === 'number') {
                options.skipRows = dialect.skipInitialRows;
            }
            if (typeof dialect.trimFields === 'boolean') {
                options.trim = dialect.trimFields;
            }
        }
        return options;
    }
    function serialize(data, dialect) {
        var a = data instanceof Array ? data : dataToArrays(data);
        var options = normalizeDialectOptions(dialect);
        var fieldToString = function fieldToString(field) {
            if (field === null) {
                field = '';
            } else if (typeof field === "string" && rxNeedsQuoting.test(field)) {
                if (options.escape) {
                    field = field.replace(/"/g, '""');
                }
                field = options.quoteChar + field + options.quoteChar;
            } else if (typeof field === "number") {
                field = field.toString(10);
            }
            return field;
        };
        var outBuffer = '';
        for (var i = 0; i < a.length; i += 1) {
            var fields = a[i];
            var rowBuffer = '';
            for (var j = 0; j < fields.length; j += 1) {
                var fieldBuffer = fieldToString(fields[j]);
                if (j === fields.length - 1) {
                    rowBuffer += fieldBuffer;
                    outBuffer += rowBuffer + options.lineTerm;
                    rowBuffer = '';
                } else {
                    rowBuffer += fieldBuffer + options.delim;
                }
            }
        }
        return outBuffer;
    }
    exports_1("serialize", serialize);
    function normalizeInputString(csvText, dialect) {
        if (!dialect || dialect && !dialect.lineTerminator) {
            csvText = normalizeLineTerminator(csvText, dialect);
        }
        var options = normalizeDialectOptions(dialect);
        return { s: chomp(csvText, options.lineTerm), options: options };
    }
    function parse(csvText, dialect) {
        var _a = normalizeInputString(csvText, dialect),
            s = _a.s,
            options = _a.options;
        var sLength = s.length;
        var ch = '';
        var inQuote = false;
        var fieldQuoted = false;
        var field = '';
        var row = [];
        var out = [];
        var parseField = function parseField(fieldAsString) {
            if (fieldQuoted) {
                return fieldAsString;
            } else {
                if (fieldAsString === '') {
                    return null;
                } else if (options.trim) {
                    fieldAsString = trim(fieldAsString);
                }
                if (rxIsInt.test(fieldAsString)) {
                    return parseInt(fieldAsString, 10);
                } else if (rxIsFloat.test(fieldAsString)) {
                    return parseFloat(fieldAsString);
                } else {
                    return fieldAsString;
                }
            }
        };
        for (var i = 0; i < sLength; i += 1) {
            ch = s.charAt(i);
            if (inQuote === false && (ch === options.delim || ch === options.lineTerm)) {
                field = parseField(field);
                row.push(field);
                if (ch === options.lineTerm) {
                    out.push(row);
                    row = [];
                }
                field = '';
                fieldQuoted = false;
            } else {
                if (ch !== options.quoteChar) {
                    field += ch;
                } else {
                    if (!inQuote) {
                        inQuote = true;
                        fieldQuoted = true;
                    } else {
                        if (s.charAt(i + 1) === options.quoteChar) {
                            field += options.quoteChar;
                            i += 1;
                        } else {
                            inQuote = false;
                        }
                    }
                }
            }
        }
        field = parseField(field);
        row.push(field);
        out.push(row);
        if (options.skipRows) out = out.slice(options.skipRows);
        return out;
    }
    exports_1("parse", parse);
    var rxIsInt, rxIsFloat, rxNeedsQuoting, trim;
    return {
        setters: [],
        execute: function () {
            rxIsInt = /^\d+$/;
            rxIsFloat = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;
            rxNeedsQuoting = /^\s|\s$|,|"|\n/;
            trim = function () {
                if (String.prototype.trim) {
                    return function (s) {
                        return s.trim();
                    };
                } else {
                    return function (s) {
                        return s.replace(/^\s*/, '').replace(/\s*$/, '');
                    };
                }
            }();
        }
    };
});
System.register("davinci-csv.js", ["./davinci-csv/config", "./davinci-csv/core/CSV"], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var config_1, CSV_1, csv;
    return {
        setters: [function (config_1_1) {
            config_1 = config_1_1;
        }, function (CSV_1_1) {
            CSV_1 = CSV_1_1;
        }],
        execute: function () {
            csv = {
                get LAST_MODIFIED() {
                    return config_1.default.LAST_MODIFIED;
                },
                get VERSION() {
                    return config_1.default.VERSION;
                },
                get dataToArrays() {
                    return CSV_1.dataToArrays;
                },
                get parse() {
                    return CSV_1.parse;
                },
                get serialize() {
                    return CSV_1.serialize;
                }
            };
            exports_1("default", csv);
        }
    };
});
//# sourceMappingURL=davinci-csv-system-es5.js.map