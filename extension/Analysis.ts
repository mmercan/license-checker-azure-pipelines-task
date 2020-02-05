import tl = require('azure-pipelines-task-lib/task');
import { IPackage, IProjectReport } from './models'

export default class Analysis {
    defaultWorkingDirectory = "";
    status = 'NONE';
    licenseProjects: any = {};
    htmlcontent = "";
    constructor(private projects: IProjectReport) {

        this.defaultWorkingDirectory = tl.getVariable("System.DefaultWorkingDirectory") + "\\";
        this.getlicenseProjects();
        this.htmlcontent = this.getHtmlAnalysisReport();

        //let stringgg = JSON.stringify(this.vulnerableProjects);
        //dconsole.info(this.htmlcontent);
    }

    getlicenseProjects() {
        this.status = 'OK';
        for (let prj in this.projects) {
            var prjshort = prj.replace(this.defaultWorkingDirectory, "");
            for (let pck in this.projects[prj].packages) {
                if (this.projects[prj].packages[pck].license) {
                    this.licenseProjects[prjshort] = this.projects[prj].packages[pck];
                    this.status = "WARN";
                }
            };
        };
    }

    getHtmlAnalysisReport(): string {

        const qgStyle = `background-color: ${this.getlicenseColor()};
        padding: 4px 12px;
        color: #fff;
        letter-spacing: 0.02em;
        line-height: 24px;
        font-weight: 600;
        font-size: 12px;
        margin-left: 15px;`;

        //     var html = `<div style="padding-top: 8px;">
        //     <span>${this.projectName ? this.projectName + ' ' : ''}Quality Gate</span>
        //     <span style="${qgStyle}">
        //       ${formatMeasure(this.status, 'LEVEL')}
        //     </span>
        //   </div>`;
        var html = ``;
        for (let prj in this.projects) {
            html += `<p>${prj} </p>
            <dl>`

            for (let pck in this.projects[prj].packages) {
                if (this.projects[prj].packages[pck]) {
                    html += `<dt>${this.projects[prj].packages[pck].name} ${this.projects[prj].packages[pck].version}</dt>`;

                    if (this.projects[prj].packages[pck].license && this.projects[prj].packages[pck].license.found) {
                        html += `<dd> <strong> ${this.projects[prj].packages[pck].license.licenseType}  </strong> : <a href="${this.projects[prj].packages[pck].license.licenseUrl}" target="_blank">${this.projects[prj].packages[pck].license.licenseUrl}</a></dd>`;
                    } else {
                        html += `<dd> license info not found</dd>`;
                    }
                }
            }
            html += `</dl>`;
        }

        return html;


    }

    private getlicenseColor() {
        switch (this.status) {
            case 'OK':
                return '#00aa00';
            case 'WARN':
                return '#ed7d20';
            case 'ERROR':
                return '#d4333f';
            case 'NONE':
                return '#b4b4b4';
            default:
                return '#b4b4b4';
        }
    }

}
