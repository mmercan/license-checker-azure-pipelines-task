import task = require('azure-pipelines-task-lib');
import tl = require('azure-pipelines-task-lib/task');
import trm = require('azure-pipelines-task-lib/toolrunner');
import fs = require('fs');
import path = require('path');
// import { request } from 'https';
import request = require('request');
import { error } from 'azure-pipelines-task-lib';
import xml2js = require('xml2js');
import publishAnalysis from './publish'
import { IPackage, ILicense, IProjectReport, IglobalPackageList } from './models'

task.setResourcePath(path.join(__dirname, 'task.json'));

var parser = new xml2js.Parser();
var globalPackageList: IglobalPackageList = {};

async function run() {
    let projects: string[] = [];
    let searchFordepsjson: boolean = false;   //task.getBoolInput("searchdepsjsoninprojects", false);

    let filename: string = task.getInput('fileName', true);
    const filePath = tl.findMatch(tl.getVariable("System.DefaultWorkingDirectory"), filename)[0];

    console.info("Path is " + filePath);
    if (filePath.toLocaleLowerCase().endsWith('sln')) {
        projects = analyzeSolution(filePath);
    } else if (filePath.toLocaleLowerCase().endsWith('csproj')) {
        projects.push(filePath);
    }

    let projectlist: IProjectReport = {};

    if (projects.length > 0) {
        projects.forEach((project) => {
            projectlist[project] = { packages: {} };
            // console.info("=== " + project + " ===");
            if (searchFordepsjson) {
                let packages = analyzeDepsjson(project);
                // projectlist[project].packages = packages;
            } else {
                let packages = analyzeProject(project);
                projectlist[project].packages = packages;
            }
        });
    }

    await analyzeAllPackages();

    for (let prj in projectlist) {
        for (let pck in projectlist[prj].packages) {
            if (globalPackageList[pck]) {
                projectlist[prj].packages[pck] = globalPackageList[pck];
            }
        }
    }
    console.log("### projectlist ###");
    for (let prj in projectlist) {
        console.log(`${prj}`)
        for (let pck in projectlist[prj].packages) {
            consolepackageres(projectlist[prj].packages[pck])
        };
    }

    await publishAnalysis(projectlist);
}

function analyzeSolution(slnLocation: string): string[] {
    console.info("Checking Projects in the Solution");
    let projects: string[] = [];
    let slnfolder = path.dirname(slnLocation)
    let filecontent = fs.readFileSync(slnLocation, 'utf8');
    //console.info(filecontent);
    let i = 0;
    filecontent.split(/\r?\n/).forEach((line) => {
        if (!line.startsWith("Project")) {
            return;
        }
        let regex = new RegExp("(.*) = \"(.*?)\", \"(.*?.(cs|vb)proj)\"");
        let match = regex.exec(line);
        if (match && match.length > 0) {
            i++;
            //const fullprjlocation = tl.findMatch(slnfolder, match[3])[0];
            const fullprjlocation = path.join(slnfolder, match[3])
            projects.push(fullprjlocation);
            console.log(i + " : " + fullprjlocation);
        }
    });
    return projects;
}

function analyzeProject(prjLocation: string): IglobalPackageList {
    console.info(`Checking packages in ${prjLocation} project`);
    let packages: IglobalPackageList = {};
    let filecontent = fs.readFileSync(prjLocation, 'utf8');

    let i = 0;
    filecontent.split(/\r?\n/).forEach((line) => {
        if (!line.trim().startsWith("<PackageReference")) {
            return;
        }
        parser.parseString(line, (err: any, result: any) => {
            let coordinate = "";
            // https://api.nuget.org/v3-flatcontainer/Polly/7.1.0/Polly.nuspec
            if (result.PackageReference) {
                if (result.PackageReference.$.Include) {
                    if (result.PackageReference.$.Version) {
                        coordinate = `https://api.nuget.org/v3-flatcontainer/${result.PackageReference.$.Include}/${result.PackageReference.$.Version}/${result.PackageReference.$.Include}.nuspec`
                    } else {
                        console.warn(result.PackageReference.$.Include + "Package doesn't have version number");
                    }
                }
                if (!globalPackageList[coordinate]) {
                    globalPackageList[coordinate] = { license: {}, version: result.PackageReference.$.Version, name: result.PackageReference.$.Include };
                }
                if (!packages[coordinate]) {
                    packages[coordinate] = { license: {}, version: result.PackageReference.$.Version, name: result.PackageReference.$.Include };;
                }
            }
        });
    });
    return packages;
}



function analyzeAllPackages() {
    return new Promise((resolve, reject) => {
        let promises: Promise<any>[] = [];
        for (let key in globalPackageList) {
            let prom = analyzePackage(key);
            promises.push(prom);
        }
        try {
            Promise.all(promises).then(function (values) {
                console.log("Promise.all success");
                resolve(values);
            }).catch(error => {
                resolve(error);
                console.log("Promise.all error" + error);
            });

        } catch (error) {
            //reject(error);
            resolve(error);
            console.log(`catch: ${error}`)
        }
    });
}

function analyzePackage(pack: string) {
    return new Promise((resolve, reject) => {
        request.get(pack,
            (error, res, body: string) => {
                if (error) {
                    console.error(error)
                    reject(error);
                    //resolve(error);
                    return
                }
                console.log(`statusCode: ${res.statusCode}`)
                if (res.statusCode == 200) {
                    const license = extractnuspec(body);
                    if (globalPackageList[pack]) {
                        globalPackageList[pack].license = license;
                    }
                    resolve(body);
                } else if (res.statusCode == 404) {
                    console.info(`Found : false`);
                    const license: ILicense = { found: false };
                    if (globalPackageList[pack]) {
                        globalPackageList[pack].license = license;
                    }
                    resolve(body);
                }
                else {
                    //reject(body);
                    resolve(body);
                }
            });
    });
}

function extractnuspec(filecontent: string): ILicense {
    let i = 0;
    let item: ILicense = { found: false, licenseType: '' };
    filecontent.split(/\r?\n/).forEach((line) => {
        if (!line.trim().startsWith("<license")) {
            return;
        }
        parser.parseString(line, (err: any, result: any) => {
            if (result.license && result.license._) {
                console.info(`License Type ${result.license._}`);
                item.licenseType = result.license._;
            }

            if (!item.licenseType) {
                item.licenseType = "Check license url"
            }

            if (result.licenseUrl) {
                item.licenseUrl = result.licenseUrl;
                item.found = true;
            }
            console.info(`Found : ${item.found}, License ${item.licenseType},LicenseUrl : ${item.licenseUrl} `);
        });
    });

    return item;
}

// #########################################

function paginate(array: any[], page_size: number, page_number: number) {
    return array.slice(page_number * page_size, (page_number + 1) * page_size);
}

function consolepackageres(item: IPackage) {
    if (item.license && item.license.found) {
        let message = `${item.name} ${item.version} ${item.license.licenseUrl}  ${item.license.licenseType}`;
        console.log(message);
    } else {
        let message = `${item.name} ${item.version} license not found`;
        console.log(message);
    }
    // console.log(JSON.stringify(item));
    //let message = "";
    // message = `   ${item.coordinates} ${item.vulnerabilityText}`;
    // console.log(message);
    // if (item.vulnerabilityCount > 0) {

    //     item.vulnerabilities.forEach((vulnerability: any) => {
    //         let vulnerabilityText = `    ${vulnerability.severity} severity :  ${vulnerability.title} `;
    //         console.log(`       ${vulnerabilityText}`);
    //         console.log(`       ${vulnerability.description}`);
    //         console.log(`       ${vulnerability.reference}`);
    //     });
    // }


}




// ##############################################3

function finddepjson(prjLocation: string): string[] {
    let folder = path.dirname(prjLocation)
    let allPaths: string[] = tl.find(folder);
    let filteredPath = allPaths.filter((itemPath: string) => itemPath.endsWith(".deps.json"));
    console.info(filteredPath);
    return filteredPath;
}

function analyzeDepsjson(prjLocation: string): string[] {
    let packages: any = {};
    // let deps = finddepjson(prjLocation);
    // deps.forEach((dep) => {
    //     let numberoflibraries = 0;

    //     let filecontent = fs.readFileSync(dep, 'utf8');
    //     let content = JSON.parse(filecontent);
    //     if (content.libraries) {
    //         for (let key in content.libraries) {
    //             if (content.libraries.hasOwnProperty(key)) {
    //                 numberoflibraries++;
    //                 let coordinate = 'pkg:nuget/' + key.replace('/', '@');
    //                 if (!packages[coordinate]) {
    //                     packages[coordinate] = {};
    //                 }
    //                 if (!globalPackageList[coordinate]) {
    //                     globalPackageList[coordinate] = {};
    //                 }
    //             }
    //         }
    //     }
    //     console.log(`${dep} >> ${numberoflibraries} package found`);
    // });
    return packages;
}

run();

