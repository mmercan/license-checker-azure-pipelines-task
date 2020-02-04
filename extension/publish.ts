import task = require('azure-pipelines-task-lib');
import tl = require('azure-pipelines-task-lib/task');
import trm = require('azure-pipelines-task-lib/toolrunner');
//import fs = require('fs');
import fs = require('fs-extra');
import path = require('path');
import Analysis from './Analysis'
import { IPackage, IVulnerability, IProjectReport } from './models'


export default async function publishAnalysis(projects: IProjectReport) {
    console.log(`publish task triggered`);

    let analysisReport = new Analysis(projects);
    publishBuildSummary(analysisReport.htmlcontent);
}



export function publishBuildSummary(summary: string) {
    uploadBuildSummary(saveBuildSummary(summary), `Nuget Analysis Report`);
}


export function saveBuildSummary(summary: string): string {
    const filePath = path.join(getStagingDirectory(), 'nugetBuildSummary.md');
    fs.writeFileSync(filePath, summary);
    tl.debug(`[SQ] Summary saved at: ${filePath}`);
    return filePath;
}

export function getStagingDirectory(): string {
    const dir = path.join(tl.getVariable('build.artifactStagingDirectory'), '.sqAnalysis');
    fs.ensureDirSync(dir);
    return dir;
}

export function uploadBuildSummary(summaryPath: string, title: string): void {
    tl.debug(`[SQ] Uploading build summary from ${summaryPath}`);
    tl.command(
        'task.addattachment',
        {
            type: 'Distributedtask.Core.Summary',
            name: title
        },
        summaryPath
    );
}