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
                    this.LAST_MODIFIED = '2017-02-20';
                    this.NAMESPACE = 'CSV';
                    this.VERSION = '0.0.1';
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
    function normalizeDialectOptions(options) {
        var out = {
            delimiter: ',',
            doublequote: true,
            lineterminator: '\n',
            quotechar: '"',
            skipinitialspace: true,
            skipinitialrows: 0
        };
        if (options) {
            for (var key in options) {
                if (key === 'trim') {
                    out.skipinitialspace = options.trim ? options.trim : false;
                } else {
                    out[key.toLowerCase()] = options[key];
                }
            }
        }
        return out;
    }
    function serialize(data, dialect) {
        var a = data instanceof Array ? data : dataToArrays(data);
        var options = normalizeDialectOptions(dialect);
        var fields = [];
        var fieldBuffer = '';
        var rowBuffer = '';
        var outBuffer = '';
        var processField = function processedField(field) {
            if (field === null) {
                field = '';
            } else if (typeof field === "string" && rxNeedsQuoting.test(field)) {
                if (options.doublequote) {
                    field = field.replace(/"/g, '""');
                }
                field = options.quotechar + field + options.quotechar;
            } else if (typeof field === "number") {
                field = field.toString(10);
            }
            return field;
        };
        for (var i = 0; i < a.length; i += 1) {
            fields = a[i];
            for (var j = 0; j < fields.length; j += 1) {
                fieldBuffer = processField(fields[j]);
                if (j === fields.length - 1) {
                    rowBuffer += fieldBuffer;
                    outBuffer += rowBuffer + options.lineterminator;
                    rowBuffer = '';
                } else {
                    rowBuffer += fieldBuffer + options.delimiter;
                }
                fieldBuffer = '';
            }
        }
        return outBuffer;
    }
    exports_1("serialize", serialize);
    function parse(s, dialect) {
        if (!dialect || dialect && !dialect.lineTerminator) {
            s = normalizeLineTerminator(s, dialect);
        }
        var options = normalizeDialectOptions(dialect);
        s = chomp(s, options.lineterminator);
        var cur = '';
        var inQuote = false;
        var fieldQuoted = false;
        var fieldX = '';
        var row = [];
        var out = [];
        var processField = function processField(field) {
            if (fieldQuoted !== true) {
                if (field === '') {
                    return null;
                } else if (options.skipinitialspace === true) {
                    field = trim(field);
                }
                if (rxIsInt.test(field)) {
                    return parseInt(field, 10);
                } else if (rxIsFloat.test(field)) {
                    return parseFloat(field);
                } else {
                    return field;
                }
            } else {
                return field;
            }
        };
        for (var i = 0; i < s.length; i += 1) {
            cur = s.charAt(i);
            if (inQuote === false && (cur === options.delimiter || cur === options.lineterminator)) {
                fieldX = processField(fieldX);
                row.push(fieldX);
                if (cur === options.lineterminator) {
                    out.push(row);
                    row = [];
                }
                fieldX = '';
                fieldQuoted = false;
            } else {
                if (cur !== options.quotechar) {
                    fieldX += cur;
                } else {
                    if (!inQuote) {
                        inQuote = true;
                        fieldQuoted = true;
                    } else {
                        if (s.charAt(i + 1) === options.quotechar) {
                            fieldX += options.quotechar;
                            i += 1;
                        } else {
                            inQuote = false;
                        }
                    }
                }
            }
        }
        fieldX = processField(fieldX);
        row.push(fieldX);
        out.push(row);
        if (options.skipinitialrows) out = out.slice(options.skipinitialrows);
        return out;
    }
    exports_1("parse", parse);
    var rxIsInt, rxIsFloat, rxNeedsQuoting, trim;
    return {
        setters: [],
        execute: function () {
            rxIsInt = /^\d+$/;
            rxIsFloat = /^\d*\.\d+$|^\d+\.\d*$/;
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