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
import { IPackage, IVulnerability, IProjectReport } from './models'

task.setResourcePath(path.join(__dirname, 'task.json'));

var parser = new xml2js.Parser();
var globalPackageList: any = {};
var failifseverityhigher: string;
var shouldTaskFails = false;

async function run() {
    let filename: string = task.getInput('fileName', true);
    if (!filename) { };
    let searchFordepsjson: boolean = false;//task.getBoolInput("searchdepsjsoninprojects", false);

    failifseverityhigher = task.getInput("failifseverityhigher", false);
    if (!failifseverityhigher) { failifseverityhigher = "None"; }
    let projects: string[] = [];
    const filePath = tl.findMatch(tl.getVariable("System.DefaultWorkingDirectory"), filename)[0];

    console.info("Path is " + filePath);
    if (filePath.toLocaleLowerCase().endsWith('sln')) {
        console.info("Checking Projects in the Solution");
        projects = analyzeSolution(filePath);
    } else if (filePath.toLocaleLowerCase().endsWith('csproj')) {
        console.info("Checking Projects in the Solution");
        projects.push(filePath);
    }

    let projectlist: IProjectReport = {};

    if (projects.length > 0) {
        projects.forEach((project) => {
            projectlist[project] = { packages: undefined };
            console.info("=== " + project + " ===");
            if (searchFordepsjson) {
                let packages = analyzeDepsjson(project);
                projectlist[project].packages = packages;
            } else {
                let packages = analyzeProject(project);
                projectlist[project].packages = packages;
            }
        });
    }

    let packageList = [];
    for (let key in globalPackageList) {
        packageList.push(key);
        console.log(`${key}`)
    }
    await analyzeAllPackages(packageList);

    for (let prj in projectlist) {
        for (let pck in projectlist[prj].packages) {
            if (globalPackageList[pck]) {
                projectlist[prj].packages[pck] = globalPackageList[pck];
            }
        }
    }

    for (let prj in projectlist) {
        console.log("");
        console.log(`${prj}`)
        for (let pck in projectlist[prj].packages) {
            consolepackageres(projectlist[prj].packages[pck])
        };
    }


    // console.log(`All Packages: ${packageList.length}`)
    console.log(`failifseverityhigher: ${failifseverityhigher}`)
    console.log(`shouldTaskFails: ${shouldTaskFails}`)


    // await publishAnalysis(projectlist);
}

function analyzeSolution(slnLocation: string): string[] {
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

function analyzeProject(prjLocation: string): string[] {
    let packages: any = {};
    let filecontent = fs.readFileSync(prjLocation, 'utf8');

    let i = 0;
    filecontent.split(/\r?\n/).forEach((line) => {
        if (!line.trim().startsWith("<PackageReference")) {
            return;
        }
        parser.parseString(line, (err: any, result: any) => {
            let coordinate = "";//"https://api.nuget.org/v3-flatcontainer/";
            // "pkg:nuget/EnterpriseLibrary.Common@6.0.1304"
            // https://api.nuget.org/v3-flatcontainer/Polly/7.1.0/Polly.nuspec
            if (result.PackageReference) {
                if (result.PackageReference.$.Include) {
                    //coordinate += result.PackageReference.$.Include + "/"
                    if (result.PackageReference.$.Version) {
                        // coordinate += result.PackageReference.$.Version
                        coordinate = `https://api.nuget.org/v3-flatcontainer/${result.PackageReference.$.Include}/${result.PackageReference.$.Version}/${result.PackageReference.$.Include}.nuspec`
                    } else {
                        console.warn(result.PackageReference.$.Include + "Package doesn't have version number");
                    }
                }
                if (!globalPackageList[coordinate]) {
                    globalPackageList[coordinate] = {};
                }
                if (!packages[coordinate]) {
                    packages[coordinate] = {};
                }
            }
        });
    });
    return packages;
}

// #########################################

async function analyzeAllPackages(packagecoordinates: string[]): Promise<any> {
    //let pageitem = 127;
    //let allpages = [];
    //let totalpageNumber = Math.ceil(packagecoordinates.length / pageitem);
    // for (let index = 0; index < totalpageNumber; index++) {
    //     let paged = paginate(packagecoordinates, pageitem, index)
    //     allpages.push(paged);
    //     try {
    //         await analyzePackages(paged);
    //     } catch (error) {
    //         console.log(`catch: ${error}`)
    //     }
    //}
    // return allpages;

    packagecoordinates.forEach(async (pack) => {
        try {
            await analyzePackages(pack);
        } catch (error) {
            console.log(`catch: ${error}`)
        }

    });
}

function analyzePackages(pack: string) {
    return new Promise((resolve, reject) => {
        request.get(pack,
            // { json: { coordinates: packagecoordinates } }
            (error, res, body: IPackage[]) => {
                if (error) {
                    console.error(error)
                    reject(error);
                    return
                }
                console.log(`statusCode: ${res.statusCode}`)
                if (res.statusCode == 200) {
                    console.error(body)
                    // body.forEach(pck => {
                    //     console.error(pck)
                    //     // extractpackagedata(pck);
                    // });
                    resolve(body);
                } else {
                    reject(body);
                }
            });
    });
}

function extractpackagedata(pck: IPackage) {
    let item: any = {};
    item.coordinates = pck.coordinates;
    if (pck.vulnerabilities.length > 0) {
        item.vulnerabilityText = "There are  " + pck.vulnerabilities.length + " vulnerabilities";
        item.vulnerabilityCount = pck.vulnerabilities.length;
        item.vulnerabilities = pck.vulnerabilities;

        item.vulnerabilities.forEach((vulnerability: any) => {
            if (vulnerability.cvssScore) {

                if (vulnerability.cvssScore >= 0.1 && vulnerability.cvssScore <= 3.9) {
                    vulnerability.severity = "LOW";
                    if (failifseverityhigher == "LOW") {
                        shouldTaskFails = true;
                        vulnerability.TaskFailed = "Task Will Fail"
                    }
                }

                if (vulnerability.cvssScore >= 4.0 && vulnerability.cvssScore <= 6.9) {
                    vulnerability.severity = "MEDIUM";
                    // severityForegroundColor = ConsoleColor.Yellow;
                    if (failifseverityhigher == "LOW" || failifseverityhigher == "MEDIUM") {
                        shouldTaskFails = true;
                        vulnerability.TaskFailed = "Task Will Fail"
                    }
                }

                if (vulnerability.cvssScore >= 7.0 && vulnerability.cvssScore <= 8.9) {
                    vulnerability.severity = "HIGH";
                    // severityForegroundColor = ConsoleColor.Red;
                    if (failifseverityhigher == "LOW" || failifseverityhigher == "MEDIUM" ||
                        failifseverityhigher == "HIGH") {
                        shouldTaskFails = true;
                        vulnerability.TaskFailed = "Task Will Fail"
                    }
                }

                if (vulnerability.cvssScore >= 9.0) {
                    vulnerability.severity = "CRITICAL";
                    // severityForegroundColor = ConsoleColor.Red;
                    if (failifseverityhigher == "LOW" || failifseverityhigher == "MEDIUM" ||
                        failifseverityhigher == "HIGH" || failifseverityhigher == "CRITICAL") {
                        shouldTaskFails = true;
                        vulnerability.TaskFailed = "Task Will Fail"
                    }
                }
            }
        });

    } else {
        item.vulnerabilityText = "There is no vulnerability";
        item.vulnerabilityCount = 0;
        item.vulnerabilities = {};
    }
    if (globalPackageList[item.coordinates]) {
        globalPackageList[item.coordinates] = item;
    } else {
        console.log("****************** " + item.coordinates + " not found to add to globalPackageList ******************************")
    }
    // globalVulnerabilityList.push(item);
    // consolepackageres(item);
    //console.log(JSON.stringify(item));
}

function paginate(array: any[], page_size: number, page_number: number) {
    return array.slice(page_number * page_size, (page_number + 1) * page_size);
}

function consolepackageres(item: any) {
    // console.log(JSON.stringify(item));
    let message = "";
    message = `   ${item.coordinates} ${item.vulnerabilityText}`;
    console.log(message);
    if (item.vulnerabilityCount > 0) {

        item.vulnerabilities.forEach((vulnerability: any) => {
            let vulnerabilityText = `    ${vulnerability.severity} severity :  ${vulnerability.title} `;
            console.log(`       ${vulnerabilityText}`);
            console.log(`       ${vulnerability.description}`);
            console.log(`       ${vulnerability.reference}`);
        });
    }


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
    let deps = finddepjson(prjLocation);
    deps.forEach((dep) => {
        let numberoflibraries = 0;

        let filecontent = fs.readFileSync(dep, 'utf8');
        let content = JSON.parse(filecontent);
        if (content.libraries) {
            for (let key in content.libraries) {
                if (content.libraries.hasOwnProperty(key)) {
                    numberoflibraries++;
                    let coordinate = 'pkg:nuget/' + key.replace('/', '@');
                    if (!packages[coordinate]) {
                        packages[coordinate] = {};
                    }
                    if (!globalPackageList[coordinate]) {
                        globalPackageList[coordinate] = {};
                    }
                }
            }
        }
        console.log(`${dep} >> ${numberoflibraries} package found`);
    });
    return packages;
}

run();

