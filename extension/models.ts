
export interface IProjectReport {
    [index: string]: IPackages

}

export interface IPackages {
    packages: any
}

export interface IPackage {
    coordinates: string;
    description: string;
    reference: string;
    vulnerabilities: any[];
}
export interface IVulnerability {
    id: string;
    title: string;
    description: string;
    cvssScore: number;
    cvssVector: string;
    cve: string;
    reference: string;
    severity?: string;
}

