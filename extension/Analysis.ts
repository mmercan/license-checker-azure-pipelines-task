import tl = require('azure-pipelines-task-lib/task');
import { IPackage, IVulnerability, IProjectReport } from './models'

export default class Analysis {
    defaultWorkingDirectory = "";
    status = 'NONE';
    vulnerableProjects: any = {};
    htmlcontent = "";
    constructor(private projects: IProjectReport) {

        this.defaultWorkingDirectory = tl.getVariable("System.DefaultWorkingDirectory") + "\\";
        this.getVulnerableProjects();
        this.htmlcontent = this.getHtmlAnalysisReport();

        //let stringgg = JSON.stringify(this.vulnerableProjects);
        //dconsole.info(this.htmlcontent);
    }

    getVulnerableProjects() {
        //var vulnerableProjects: any = {};
        this.status = 'OK';
        for (let prj in this.projects) {
            var prjshort = prj.replace(this.defaultWorkingDirectory, "");
            for (let pck in this.projects[prj].packages) {
                if (this.projects[prj].packages[pck].vulnerabilities && this.projects[prj].packages[pck].vulnerabilities.length > 0) {
                    this.vulnerableProjects[prjshort] = this.projects[prj].packages[pck];
                    this.status = "WARN";
                }
            };
        };
    }

    getHtmlAnalysisReport(): string {

        const qgStyle = `background-color: ${this.getvulnerabilityColor()};
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
                if (this.projects[prj].packages[pck].vulnerabilities && this.projects[prj].packages[pck].vulnerabilities.length > 0) {
                    html += `<dt>${pck}</dt>`;

                    this.projects[prj].packages[pck].vulnerabilities.forEach((vul: IVulnerability) => {
                        html += `<dd> <strong> ${vul.severity}  </strong> ${vul.description}</dd>`;
                    });
                }
            }
            html += `</dl>`;
        }

        return html;


    }

    private getvulnerabilityColor() {
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
