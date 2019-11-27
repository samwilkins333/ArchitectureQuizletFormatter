import { readFile, writeFile, readdir, existsSync, mkdirSync } from 'fs';
import * as rimraf from 'rimraf';

type DateRange = number | { start: number, end: number };

interface Building {
    location: string;
    name: string;
    date: DateRange | DateRange[];
    architect: string;
}

interface FileTemplate {
    lines: string[];
    filename: string;
}

const comparatorHelper = (date: DateRange | DateRange[]): number => {
    const helper = (date: DateRange) => typeof date === "number" ? date : date.start;
    return Array.isArray(date) ? helper(date[0]) : helper(date);
}

const input = "./input";
const output = "./output";
const dateComparator = ({ date: first }, { date: second }) => comparatorHelper(first) - comparatorHelper(second);

let delimiter = ":"
console.log(process.argv, __dirname);
if (process.argv.length > 2) {
    delimiter = process.argv[2];
}

async function execute() {
    if (!existsSync(input)) {
        console.log("No source files provided! Process exiting...");
        process.exit(1);
    }
    await clean(output);
    (await new Promise<String[]>((resolve, reject) => {
        readdir(input, (err, files) => {
            if (err) {
                return reject(err);
            }
            resolve(files);
        });
    })).map(processFile);
}

async function processFile(file: string) {
    const sourceName = file.split('.')[0];
    const outputPrefix = `${output}/${sourceName}`;
    await clean(outputPrefix);
    let buildings: string;
    try {
        buildings = await new Promise<string>((resolve, reject) => {
            readFile(`${input}/${file}`, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data.toString());
            });
        });
    } catch (e) {
        console.error(e.message);
    }
    if (!buildings) {
        return;
    }
    const cleaned = buildings.replace(/\“/g, '"').replace(/\,\”/g, '",').replace(/\–/g, '-');
    const lines = cleaned.split('\n');
    const constructed: Building[] = [];
    const failed: string[] = [];
    lines.map(line => {
        const matches = /(\D+), (\D+), ([0-9\-, f]+), (\D+)/g.exec(line);
        if (matches !== null) {
            constructed.push({
                location: matches[1],
                name: matches[2],
                date: parse(matches[3].replace(/ff/g, '').split(',').map(range => range.split('-'))),
                architect: matches[4]
            } as Building);
        } else {
            failed.push(line);
        }
    });
    if (failed.length) {
        console.error("Error!");
        console.error(failed.join('\n'))
        throw new Error("Some line(s) could not be parsed!");
    }
    const files: FileTemplate[] = [
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
    await Promise.all(files.map(({ filename, lines }) => 
        new Promise<void>((resolve, reject) => {
            writeFile(`${outputPrefix}/${sourceName}_${filename}`, lines.join('\n'), err => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })
    ));
}

async function clean(path: string) {
    if (existsSync(path)) {
        await new Promise<void>((resolve, reject) => rimraf(path, error => {
            if (error) {
                return reject();
            }
            resolve();
        }));
    }
    mkdirSync(path);
}

function parse(raw: string[][]) {
    const ranges = raw.map(date => {
        date = date.map(element => element.trim());
        if (date.length === 1) {
            return Number(date[0]);
        }
        let end: string;
        if (date[1].length === 4) {
            end = date[1];
        } else {
            end = date[0].substring(0, 2) + date[1];
        }
        return {
            start: Number(date[0]),
            end: Number(end)
        }
    });    
    if (ranges.length === 1) {
        return ranges[0];
    } else {
        return ranges;
    }
}

function serialize(date: DateRange | DateRange[]) {
    const helper = (date: DateRange) => {
        if (typeof date === "number") {
            return String(date);
        } else {
            return `(${date.start} - ${date.end})`;
        }
    }
    if (Array.isArray(date)) {
        return date.map(helper).join(', ');
    } else {
        return helper(date);
    }
}

execute();