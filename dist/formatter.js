"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const rimraf = require("rimraf");
const comparatorHelper = (date) => {
    const helper = (date) => typeof date === "number" ? date : date.start;
    return Array.isArray(date) ? helper(date[0]) : helper(date);
};
const input = "./input";
const output = "./output";
const dateComparator = ({ date: first }, { date: second }) => comparatorHelper(first) - comparatorHelper(second);
let delimiter = ":";
console.log(process.argv, __dirname);
if (process.argv.length > 2) {
    delimiter = process.argv[2];
}
function execute() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs_1.existsSync(input)) {
            console.log("No source files provided! Process exiting...");
            process.exit(1);
        }
        yield clean(output);
        (yield new Promise((resolve, reject) => {
            fs_1.readdir(input, (err, files) => {
                if (err) {
                    return reject(err);
                }
                resolve(files);
            });
        })).map(processFile);
    });
}
function processFile(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const sourceName = file.split('.')[0];
        const outputPrefix = `${output}/${sourceName}`;
        yield clean(outputPrefix);
        let buildings;
        try {
            buildings = yield new Promise((resolve, reject) => {
                fs_1.readFile(`${input}/${file}`, (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data.toString());
                });
            });
        }
        catch (e) {
            console.error(e.message);
        }
        if (!buildings) {
            return;
        }
        const cleaned = buildings.replace(/\“/g, '"').replace(/\,\”/g, '",').replace(/\–/g, '-');
        const lines = cleaned.split('\n');
        const constructed = [];
        const failed = [];
        lines.map(line => {
            const matches = /(\D+), (\D+), ([0-9\-, f]+), (\D+)/g.exec(line);
            if (matches !== null) {
                constructed.push({
                    location: matches[1],
                    name: matches[2],
                    date: parse(matches[3].replace(/ff/g, '').split(',').map(range => range.split('-'))),
                    architect: matches[4]
                });
            }
            else {
                failed.push(line);
            }
        });
        if (failed.length) {
            console.error("Error!");
            console.error(failed.join('\n'));
            throw new Error("Some line(s) could not be parsed!");
        }
        const files = [
            {
                filename: "all.txt",
                lines: constructed.map(({ name, architect, location, date }) => `${name}${delimiter} ${architect}, ${location}, ${serialize(date)}`)
            },
            {
                filename: "architects.txt",
                lines: constructed.map(({ name, architect, location, date }) => `${name}, ${location}, ${serialize(date)}${delimiter} ${architect}`)
            },
            {
                filename: "locations.txt",
                lines: constructed.map(({ name, architect, location, date }) => `${name}, ${architect}, ${serialize(date)}${delimiter} ${location}`)
            },
            {
                filename: "dates.txt",
                lines: constructed.map(({ name, architect, location, date }) => `${name}, ${architect}, ${location}${delimiter} ${serialize(date)}`)
            },
            {
                filename: "timeline.txt",
                lines: constructed.sort(dateComparator).map(({ name, architect, location, date }) => `${name}, ${architect}, ${location}${delimiter} ${serialize(date)}`)
            }
        ];
        yield Promise.all(files.map(({ filename, lines }) => new Promise((resolve, reject) => {
            fs_1.writeFile(`${outputPrefix}/${sourceName}_${filename}`, lines.join('\n'), err => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        })));
    });
}
function clean(path) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fs_1.existsSync(path)) {
            yield new Promise((resolve, reject) => rimraf(path, error => {
                if (error) {
                    return reject();
                }
                resolve();
            }));
        }
        fs_1.mkdirSync(path);
    });
}
function parse(raw) {
    const ranges = raw.map(date => {
        date = date.map(element => element.trim());
        if (date.length === 1) {
            return Number(date[0]);
        }
        let end;
        if (date[1].length === 4) {
            end = date[1];
        }
        else {
            end = date[0].substring(0, 2) + date[1];
        }
        return {
            start: Number(date[0]),
            end: Number(end)
        };
    });
    if (ranges.length === 1) {
        return ranges[0];
    }
    else {
        return ranges;
    }
}
function serialize(date) {
    const helper = (date) => {
        if (typeof date === "number") {
            return String(date);
        }
        else {
            return `(${date.start} - ${date.end})`;
        }
    };
    if (Array.isArray(date)) {
        return date.map(helper).join(', ');
    }
    else {
        return helper(date);
    }
}
execute();
//# sourceMappingURL=formatter.js.map